# Python Recommender for HackMate

This folder contains a standalone Python recommender that ranks applicants for a team based on:

- GitHub profile statistics (followers, repo stars, languages)
- LinkedIn / public profile text (if accessible)
- Resume text (PDF or plain text) — extracted and embedded
- Declared skills arrays

It uses sentence-transformers to compute semantic similarity between applicant profile/resume text and the team's required skills/description, combined with simple heuristics (skill overlap, GitHub metrics) to produce a final score.

WARNING: LinkedIn scraping often requires authentication and may be blocked. The LinkedIn extraction here is best-effort only.

Files
- `recommender.py` — main recommender module (functions to extract features and `recommend_applicants` entry point).
- `run_example.py` — local example showing usage with placeholder applicants.
- `requirements.txt` — Python dependencies.

Quick start
1. Create a virtual environment and install requirements:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r ml/python_recommender/requirements.txt
```

2. Run the example:

```bash
python ml/python_recommender/run_example.py
```

Notes
- Provide a `GITHUB_TOKEN` env var to increase GitHub API rate limits (optional):

```powershell
$env:GITHUB_TOKEN = 'ghp_...'
```

- The module returns a ranked list of applicants with score components so you can tune weights as needed.

If you'd like, I can:
- Add a Flask/FastAPI wrapper to call this from your Node app.
- Convert this to a lightweight microservice (Dockerized).
- Add more advanced resume parsing (spaCy, transformers) or train a custom model.
