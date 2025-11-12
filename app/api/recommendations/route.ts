

import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

type Team = {
  id?: string;
  teamName?: string | null;
  hackathonName?: string | null;
  regURL?: string | null;
  skills?: string[];
  role?: string | null;
  experience?: string | null;
};

type Applicant = {
  id: string;
  name?: string | null;
  email?: string | null;
  resumeUrl?: string | null;
  resumeBase64?: string | null;
  resumeText?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  githubProfileText?: string | null;
  githubRepoNames?: string[] | null;
  linkedinProfileText?: string | null;
  skills?: string[];
};

// -------------------- Helper: External Model Caller --------------------
async function callExternalModel(team: Team, applicants: Applicant[]) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const GEMINI_API_URL = process.env.GEMINI_API_URL;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  const safeParseModelJson = (raw?: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {}

    // Remove markdown fences and stray text
    let cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const firstIndex = cleaned.search(/[\{\[]/);
    if (firstIndex === -1) return null;
    cleaned = cleaned.slice(firstIndex);

    const openChar = cleaned[0];
    const closeChar = openChar === '{' ? '}' : ']';
    let depth = 0;
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (ch === openChar) depth++;
      else if (ch === closeChar) depth--;
      if (depth === 0) {
        const candidate = cleaned.slice(0, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          break;
        }
      }
    }

    const lastClose = cleaned.lastIndexOf(closeChar);
    if (lastClose !== -1) {
      try {
        return JSON.parse(cleaned.slice(0, lastClose + 1));
      } catch {
        return null;
      }
    }

    return null;
  };

  const applicantsForModel = applicants.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    resumeAvailable: !!a.resumeBase64,
    resumePreviewText: a.resumeText
      ? a.resumeText.length > 800
        ? a.resumeText.slice(0, 800) + '...'
        : a.resumeText
      : null,
    githubSummary: a.githubRepoNames ? a.githubRepoNames.slice(0, 10) : null,
    githubProfilePreview: a.githubProfileText
      ? a.githubProfileText.length > 800
        ? a.githubProfileText.slice(0, 800) + '...'
        : a.githubProfileText
      : null,
    skills: a.skills,
  }));

  const prompt = `IMPORTANT: Your response MUST be valid JSON only. Do NOT include any explanatory text, markdown, or code fences. Start the response with '[' or '{' and end with the matching closing bracket only.

You are an automated ATS scorer. For each applicant return JSON objects with fields: applicantId, details where details includes matchedSkills (array), skillMatchCount (integer), top skills from resume (array of top skills), find skills from github id (array).
Also rate the skills on the basis of the applicant projects and github repositories.
Also provide a score (0-100) based on how the applicant matches the team's required skills and how best the candidate is by analyzing each candidate.
Team required skills: ${JSON.stringify(team.skills || [])}.
Applicants (preview): ${JSON.stringify(applicantsForModel)}.

Notes: full resume text and profile text are available server-side but only a preview is included here to avoid token limits. Use best effort to match required skills from resume text, declared skills, and GitHub repo names/languages.`;

  // 1) Try Gemini via SDK
  if (GEMINI_API_KEY) {
    try {
      const genai = await import('@google/genai');
      const GoogleGenAI = (genai as any).GoogleGenAI || (genai as any);
      if (GoogleGenAI) {
        const ai = new (GoogleGenAI as any)({ apiKey: GEMINI_API_KEY });
        const resp: any = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        const text = resp?.text || resp?.output?.[0]?.content?.[0]?.text || null;
    const parsed = safeParseModelJson(text);

    // Debug log removed to avoid leaking model output in server logs
    console.log('Model Response:', text);

        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
      }
    } catch {}
  }

  // 3) Fallback to OpenAI
  if (OPENAI_API_KEY) {
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        const text =
          json?.choices?.[0]?.message?.content ||
          json?.choices?.[0]?.text ||
          null;
        const parsed = safeParseModelJson(text);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
      }
    } catch {}
  }

  return null;
}

// -------------------- Local ATS Fallback --------------------
function localATSScore(team: Team, applicants: Applicant[]) {
  const required = (team.skills || []).map((s) => (s || '').toLowerCase());

  const results = applicants.map((a) => {
    const declared = (a.skills || []).map((s) => (s || '').toLowerCase());

    const matchesInText = (text?: string | null) => {
      if (!text) return [] as string[];
      const lc = text.toLowerCase();
      return required.filter((r) => r && lc.includes(r));
    };

    const resumeMatches = matchesInText(a.resumeText);
    const githubMatches = matchesInText(
      (a.githubProfileText || '') + ' ' + (a.githubRepoNames || []).join(' ')
    );
    const declaredMatches = required.filter((r) => declared.includes(r));

    const matchedSet = new Set<string>([
      ...resumeMatches,
      ...githubMatches,
      ...declaredMatches,
    ]);
    const skillMatchCount = matchedSet.size;
    const skillScore = required.length > 0 ? skillMatchCount / required.length : 0;

    const hasResumeText = !!(a.resumeText && a.resumeText.trim());
    const hasResumeUrl = !!(a.resumeBase64 || (a.resumeUrl && a.resumeUrl.trim()));
    const hasGithub =
      !!(a.githubRepoNames && a.githubRepoNames.length > 0) ||
      !!(a.githubUrl && a.githubUrl.trim());

    const score =
      skillScore * 0.8 +
      (hasResumeText ? 0.12 : hasResumeUrl ? 0.06 : 0) +
      (hasGithub ? 0.05 : 0);

    const numeric = Math.round(Math.max(0, Math.min(1, score)) * 100);

    return {
      applicantId: a.id,
      score: numeric,
      details: {
        skillMatchCount,
        matchedSkills: Array.from(matchedSet),
        resumeMatches: Array.from(new Set(resumeMatches)),
        githubMatches: Array.from(new Set(githubMatches)),
        hasResumeText,
        hasResumeUrl,
        hasGithub,
      },
    };
  });

  results.sort((x, y) => y.score - x.score);
  return results;
}

// -------------------- API Handler --------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const team: Team = body.team || {};
    const applicants: Applicant[] = body.applicants || [];

    if (!Array.isArray(applicants) || applicants.length === 0) {
      return NextResponse.json({ error: 'No applicants provided' }, { status: 400 });
    }

    // Auto-return stored recommendations when the team has recommendations for all its applicants
    if (team?.id) {
      try {
        const appsCount = await (prisma as any).application.count({ where: { postId: team.id } });
        const recCount = await (prisma as any).recommendation.count({ where: { teamId: team.id } });

        if (appsCount > 0 && recCount > 0 && appsCount === recCount) {
          // Fetch stored recommendations for the applicants in this request (or all if none match)
          const applicantIds = applicants.map((a) => a.id);
          const stored = await (prisma as any).recommendation.findMany({
            where: { teamId: team.id, applicantId: { in: applicantIds } },
            orderBy: { score: 'desc' },
          });

          if (Array.isArray(stored) && stored.length > 0) {
            const results = stored.map((r: any) => ({
              applicantId: r.applicantId,
              score: r.score,
              matchedSkills: (r.details && r.details.matchedSkills) || [],
              ratedSkills: r.ratedSkills || {},
            }));
            const top3 = results.slice(0, 3).map((s: any) => s.applicantId);
            return NextResponse.json({ recommendations: results, top3, fromCache: true, showScores: true, autoShown: true });
          }
        }
      } catch (err) {
        // If DB check fails, continue with generation flow
      }
    }

    // If we have a team id, check for previously stored recommendations for all applicants.
    // If every applicant already has a stored score for this team, return the top-5 immediately.
    if (team?.id) {
      try {
        const applicantIds = applicants.map((a) => a.id);
        const stored = await (prisma as any).recommendation.findMany({
          where: { teamId: team.id, applicantId: { in: applicantIds } },
        });

        if (Array.isArray(stored) && stored.length === applicantIds.length) {
          // All applicants have stored recommendations — return top 5 by stored score
          const sorted = stored.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
          const topFive = sorted.slice(0, 5).map((r: any) => ({
            applicantId: r.applicantId,
            score: r.score,
            matchedSkills: (r.details && r.details.matchedSkills) || [],
            ratedSkills: r.ratedSkills || {},
          }));
          const top3 = topFive.slice(0, 3).map((s: any) => s.applicantId);
          return NextResponse.json({ recommendations: topFive, top3, fromCache: true, showScores: true });
        }
      } catch (err) {
        // ignore DB errors and continue to generate recommendations
      }
    }

    const extractTextFromPdf = async (buffer: Buffer) => {
      try {
        const pdfParse = await import('pdf-parse');
        const parser: any = (pdfParse as any).default || (pdfParse as any);
        const out = await parser(buffer as any);
        return out?.text || null;
      } catch {
        return null;
      }
    };

    const fetchResumeAsBase64 = async (url: string | undefined | null) => {
      if (!url) return null;
      try {
        let fetchUrl = url;
        if (fetchUrl.startsWith('/')) {
          const proto = (req.headers.get('x-forwarded-proto') || 'http').replace(/:\/?$/g, '');
          const host = req.headers.get('host') || 'localhost:3000';
          fetchUrl = `${proto}://${host}${fetchUrl}`;
        } else if (!/^https?:\/\//i.test(fetchUrl)) {
          const proto = (req.headers.get('x-forwarded-proto') || 'http').replace(/:\/?$/g, '');
          const host = req.headers.get('host') || 'localhost:3000';
          fetchUrl = `${proto}://${host}/${fetchUrl.replace(/^\/+/, '')}`;
        }

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(fetchUrl, { signal: controller.signal });
        clearTimeout(id);

        if (!resp.ok) return null;
        const arr = await resp.arrayBuffer();
        const buffer = Buffer.from(arr);
        const b64 = buffer.toString('base64');
        const text = await extractTextFromPdf(buffer);
        return { base64: b64, text };
      } catch {
        return null;
      }
    };

    const fetchGithubInfo = async (githubUrl?: string | null) => {
      if (!githubUrl) return { profileText: null, repoNames: null };
      try {
        const m = githubUrl.match(/github\.com\/(?:@)?([^\/\?\#]+)/i);
        if (!m) return { profileText: null, repoNames: null };
        const username = m[1];
        const profileResp = await fetch(`https://api.github.com/users/${username}`);
        const profileJson = profileResp.ok ? await profileResp.json() : null;
        const reposResp = await fetch(
          `https://api.github.com/users/${username}/repos?per_page=100`
        );
        const reposJson = reposResp.ok ? await reposResp.json() : null;
        const repoNames = Array.isArray(reposJson)
          ? reposJson.map((r: any) => r.name).slice(0, 50)
          : null;
        const profileText = profileJson
          ? JSON.stringify({
              login: profileJson.login,
              bio: profileJson.bio,
              name: profileJson.name,
              company: profileJson.company,
              location: profileJson.location,
            })
          : null;
        return { profileText, repoNames };
      } catch {
        return { profileText: null, repoNames: null };
      }
    };

    const applicantsWithResumes = await Promise.all(
      applicants.map(async (a) => {
        const fetched = await fetchResumeAsBase64(a.resumeUrl);
        const resumeBase64 = fetched?.base64 || null;
        const resumeText = fetched?.text || null;
        const gh = await fetchGithubInfo(a.githubUrl);
        return {
          ...a,
          resumeBase64,
          resumeText,
          githubProfileText: gh.profileText,
          githubRepoNames: gh.repoNames,
        } as Applicant;
      })
    );

    const external = await callExternalModel(team, applicantsWithResumes);
    let scored: any = null;

    if (Array.isArray(external) && external.length > 0) {
      scored = external
        .map((e: any) => ({
          applicantId: e.applicantId || e.id || e.applicant?.id,
          score: Number(e.score) || 0,
          details: e.details || {},
          ratedSkills: e.ratedSkills || e.rated_skills || {},
        }))
        .filter((s: any) => !!s.applicantId)
        .sort((a: any, b: any) => b.score - a.score);
    }

    if (!scored) {
      scored = localATSScore(team, applicants);
    }

    // Persist recommendations for this team/applicant (create or update)
    if (team?.id) {
      try {
        for (const s of scored) {
          const teamId = team.id as string;
          const applicantId = s.applicantId as string;
          // Upsert into Recommendation table (unique by teamId + applicantId)
          // Use lowercased model delegate and upsert by the compound unique key
          // Cast prisma to any to avoid TypeScript errors until the generated client is refreshed
          await (prisma as any).recommendation.upsert({
            where: { teamId_applicantId: { teamId, applicantId } },
            create: {
              teamId,
              applicantId,
              score: Number(s.score) || 0,
              details: s.details || {},
              ratedSkills: s.ratedSkills || {},
            },
            update: {
              score: Number(s.score) || 0,
              details: s.details || {},
              ratedSkills: s.ratedSkills || {},
            },
          });
        }
      } catch (dbErr) {
        // intentionally silent; do not fail the recommendation response if DB write fails
        // console.error('Failed to persist recommendations', dbErr);
      }
    }

    // Only show numeric scores & skills when every applicant received a score
    const allHaveScores = Array.isArray(scored) && applicants.length > 0 && scored.length === applicants.length && scored.every((s: any) => typeof s.score === 'number');

    const recommendationsOut = scored.map((s: any) => {
      const base: any = { applicantId: s.applicantId };
      if (allHaveScores) {
        base.score = s.score;
        // include matched skills (from details) and any ratedSkills object from the model
        base.matchedSkills = s.details?.matchedSkills || [];
        base.ratedSkills = s.ratedSkills || {};
      }
      return base;
    });

    const top3 = scored.slice(0, 3).map((s: any) => s.applicantId);
    return NextResponse.json({ recommendations: recommendationsOut, top3, showScores: allHaveScores });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

// GET handler: allow the frontend to fetch cached recommendations for a team without posting applicants.
// Example: GET /api/recommendations?teamId=<teamId>
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const teamId = url.searchParams.get('teamId');
    if (!teamId) return NextResponse.json({ error: 'teamId required' }, { status: 400 });

    try {
      const appsCount = await (prisma as any).application.count({ where: { postId: teamId } });
      const recCount = await (prisma as any).recommendation.count({ where: { teamId } });

      if (appsCount > 0 && recCount > 0 && appsCount === recCount) {
        const stored = await (prisma as any).recommendation.findMany({
          where: { teamId },
          orderBy: { score: 'desc' },
          take: 5,
        });

        const out = stored.map((r: any) => ({
          applicantId: r.applicantId,
          score: r.score,
          matchedSkills: (r.details && r.details.matchedSkills) || [],
          ratedSkills: r.ratedSkills || {},
        }));

        const top3 = out.slice(0, 3).map((s: any) => s.applicantId);
        return NextResponse.json({ recommendations: out, top3, fromCache: true, showScores: true, autoShown: true });
      }
      return NextResponse.json({ found: false, message: 'Cached recommendations not available for all applicants' });
    } catch (err) {
      return NextResponse.json({ error: 'DB error', details: String(err) }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
