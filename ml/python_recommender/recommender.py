"""
Lightweight Python recommender for HackMate.

Usage:
  from recommender import recommend_applicants
  recs = recommend_applicants(team, applicants, top_n=5)

team: dict-like with fields: id, teamName, hackathonName, skills (list), role, experience, description (optional)
applicants: list of dicts, each with fields: id, name, email, github (url), linkedin (url), resume (url or local path), skills (list)

Outputs a list of dicts: { applicant: <applicant dict>, score: <number>, breakdown: {...} }

This implementation uses:
- GitHub API (optional GITHUB_TOKEN)
- sentence-transformers (all-MiniLM-L6-v2) for embeddings
- simple heuristics for skill overlap and Github scoring
"""

from typing import List, Dict, Any, Optional, Tuple
import os
import re
import math
import requests
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer, util
import numpy as np
from PyPDF2 import PdfReader
from tqdm import tqdm

MODEL = None

def load_model():
    global MODEL
    if MODEL is None:
        MODEL = SentenceTransformer('all-MiniLM-L6-v2')
    return MODEL


# ----------------- feature extraction helpers -----------------

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    try:
        reader = PdfReader(pdf_bytes)
        texts = []
        for p in reader.pages:
            try:
                texts.append(p.extract_text() or "")
            except Exception:
                continue
        return "\n".join(texts)
    except Exception:
        return ""


def fetch_url_text(url: str, timeout=8) -> str:
    try:
        resp = requests.get(url, timeout=timeout, headers={ 'User-Agent': 'HackMate-Recommender/1.0' })
        if resp.status_code != 200:
            return ""
        content_type = resp.headers.get('content-type', '')
        if 'application/pdf' in content_type or url.lower().endswith('.pdf'):
            return extract_text_from_pdf_bytes(resp.content)
        # otherwise parse HTML
        soup = BeautifulSoup(resp.text, 'html.parser')
        # remove scripts/styles
        for s in soup(['script', 'style', 'noscript']):
            s.extract()
        text = soup.get_text(separator=' ', strip=True)
        return text
    except Exception:
        return ""


def extract_github_username(url: str) -> Optional[str]:
    if not url:
        return None
    m = re.search(r'github.com/([^/\s]+)', url)
    if m:
        return m.group(1).strip()
    return None


def github_profile_features(github_url: Optional[str], token: Optional[str] = None) -> Dict[str, Any]:
    """Return compact features: followers, public_repos, total_stars, top_languages (list)"""
    if not github_url:
        return {'followers': 0, 'public_repos': 0, 'total_stars': 0, 'top_languages': []}

    username = extract_github_username(github_url)
    if not username:
        return {'followers': 0, 'public_repos': 0, 'total_stars': 0, 'top_languages': []}

    headers = {}
    if token:
        headers['Authorization'] = f'token {token}'

    base = 'https://api.github.com'
    try:
        user_resp = requests.get(f'{base}/users/{username}', headers=headers, timeout=8)
        if user_resp.status_code != 200:
            return {'followers': 0, 'public_repos': 0, 'total_stars': 0, 'top_languages': []}
        user_data = user_resp.json()
        followers = user_data.get('followers', 0)
        public_repos = user_data.get('public_repos', 0)

        # fetch repos (first 100) and count stars + languages
        repos_resp = requests.get(f'{base}/users/{username}/repos?per_page=100', headers=headers, timeout=10)
        total_stars = 0
        lang_count = {}
        if repos_resp.status_code == 200:
            for r in repos_resp.json():
                total_stars += r.get('stargazers_count', 0)
                lang = r.get('language')
                if lang:
                    lang_count[lang] = lang_count.get(lang, 0) + 1
        top_languages = sorted(lang_count.items(), key=lambda x: x[1], reverse=True)
        top_languages = [l for l, _ in top_languages][:5]
        return {
            'followers': followers,
            'public_repos': public_repos,
            'total_stars': total_stars,
            'top_languages': top_languages,
        }
    except Exception:
        return {'followers': 0, 'public_repos': 0, 'total_stars': 0, 'top_languages': []}


# ----------------- scoring helpers -----------------

def jaccard_overlap(a: List[str], b: List[str]) -> float:
    set_a = set([x.lower().strip() for x in (a or []) if x])
    set_b = set([x.lower().strip() for x in (b or []) if x])
    if not set_a or not set_b:
        return 0.0
    inter = set_a.intersection(set_b)
    union = set_a.union(set_b)
    return len(inter) / len(union)


def normalize_github_score(followers: int, total_stars: int, public_repos: int) -> float:
    # small heuristic normalization: log scale and combine
    score = math.log1p(followers) * 0.4 + math.log1p(total_stars) * 0.5 + math.log1p(public_repos) * 0.2
    return float(score)


def embedding_similarity(text_a: str, text_b: str, model: SentenceTransformer) -> float:
    if not text_a or not text_b:
        return 0.0
    try:
        emb_a = model.encode(text_a, convert_to_tensor=True)
        emb_b = model.encode(text_b, convert_to_tensor=True)
        sim = util.pytorch_cos_sim(emb_a, emb_b).item()
        # clamp
        if math.isnan(sim):
            return 0.0
        return float(sim)
    except Exception:
        return 0.0


# ----------------- main recommend function -----------------

def recommend_applicants(team: Dict[str, Any], applicants: List[Dict[str, Any]], top_n: int = 5, github_token: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return list of top applicants with scores and breakdown.

    team: { skills: [str], description: str (optional), role: str, experience: str }
    applicants: list of { id, name, email, github, linkedin, resume, skills }
    """
    model = None
    try:
        model = load_model()
    except Exception:
        model = None

    team_skills = team.get('skills') or []
    team_desc = team.get('description') or ' '.join(team_skills)

    results = []

    # Precompute github features for applicants (may be network-bound)
    for app in tqdm(applicants, desc='Scoring applicants'):
        # Gather profile text: linkedin + resume + maybe GitHub README text
        linkedin_text = ''
        resume_text = ''
        github_text = ''

        if app.get('linkedin'):
            # best-effort; often requires login
            linkedin_text = fetch_url_text(app.get('linkedin'))

        if app.get('resume'):
            if str(app.get('resume')).lower().startswith('http'):
                resume_text = fetch_url_text(app.get('resume'))
            else:
                try:
                    with open(app.get('resume'), 'rb') as f:
                        resume_bytes = f.read()
                        resume_text = extract_text_from_pdf_bytes(resume_bytes)
                except Exception:
                    resume_text = ''

        if app.get('github'):
            # attempt to fetch github profile README or bio
            github_username = extract_github_username(app.get('github'))
            if github_username:
                try:
                    gh_user = requests.get(f'https://api.github.com/users/{github_username}', headers=( {'Authorization': f'token {github_token}'} if github_token else {} ), timeout=8)
                    if gh_user.status_code == 200:
                        gh_json = gh_user.json()
                        github_text = (gh_json.get('bio') or '') + ' ' + (gh_json.get('company') or '')
                except Exception:
                    github_text = ''

        # simple textual aggregate
        profile_text = ' '.join([linkedin_text, resume_text, github_text]).strip()

        # embeddings similarity
        emb_sim = 0.0
        if model and profile_text:
            emb_sim = embedding_similarity(team_desc, profile_text, model)

        # skills overlap
        applicant_skills = app.get('skills') or []
        skill_overlap = jaccard_overlap(team_skills, applicant_skills)

        # github score
        gh_feats = github_profile_features(app.get('github'), token=github_token)
        gh_score = normalize_github_score(gh_feats.get('followers', 0), gh_feats.get('total_stars', 0), gh_feats.get('public_repos', 0))

        # presence flags
        present_resume = 1.0 if (app.get('resume') or resume_text) else 0.0
        present_linkedin = 1.0 if app.get('linkedin') and linkedin_text else 0.0
        present_github = 1.0 if app.get('github') and (gh_feats.get('public_repos', 0) > 0 or gh_feats.get('followers', 0) > 0) else 0.0

        # Final weighted score (tunable)
        # weights: embedding 0.45, skill overlap 0.3, github 0.15, presence 0.1
        final_score = (
            (emb_sim * 0.45) + (skill_overlap * 0.3) + (min(1.0, gh_score / 10.0) * 0.15) + ((present_resume * 0.05) + (present_linkedin * 0.03) + (present_github * 0.02))
        )

        results.append({
            'applicant': app,
            'score': float(final_score),
            'breakdown': {
                'embedding_similarity': emb_sim,
                'skill_overlap': skill_overlap,
                'github_score': gh_score,
                'present_resume': present_resume,
                'present_linkedin': present_linkedin,
                'present_github': present_github,
            },
        })

    # sort by score desc
    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:top_n]


if __name__ == '__main__':
    # quick small example
    example_team = {
        'id': 'team-1',
        'teamName': 'Example Team',
        'skills': ['React', 'TypeScript', 'Tailwind', 'Prisma'],
        'description': 'We need a frontend dev with React and TypeScript experience, familiarity with Tailwind CSS and Prisma is a plus.'
    }

    example_applicants = [
        {
            'id': 'a1',
            'name': 'Alice',
            'email': 'alice@example.com',
            'github': 'https://github.com/alice',
            'linkedin': '',
            'resume': '',
            'skills': ['React', 'TypeScript', 'Node']
        },
        {
            'id': 'a2',
            'name': 'Bob',
            'email': 'bob@example.com',
            'github': 'https://github.com/bob',
            'linkedin': '',
            'resume': '',
            'skills': ['Python', 'Django']
        }
    ]

    recs = recommend_applicants(example_team, example_applicants, top_n=5, github_token=os.environ.get('GITHUB_TOKEN'))
    for r in recs:
        print(r['applicant']['name'], r['score'], r['breakdown'])
