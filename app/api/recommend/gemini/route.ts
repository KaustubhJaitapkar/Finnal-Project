import { NextResponse } from "next/server";

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
  skills?: string[];
};

const FETCH_TIMEOUT = 8000;

async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function tryFetchResumeText(url?: string | null) {
  if (!url) return null;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (ct.startsWith("text/") || ct.includes("json")) {
      return await res.text();
    }
    // binary (pdf) or unknown — don't attempt to parse
    return null;
  } catch (e) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { team, applicants } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not set in environment" }, { status: 500 });
    }

    // enrich applicants with resume text when possible (best-effort)
    const enriched = await Promise.all(
      (applicants || []).map(async (a: Applicant) => {
        const resumeText = await tryFetchResumeText(a.resumeUrl).catch(() => null);
        return { ...a, resumeText };
      })
    );

    // Build a single prompt asking Gemini to return JSON array of scores 0-100
    const teamReqs = [] as string[];
    if (team.skills && team.skills.length) teamReqs.push(`skills: ${team.skills.join(", ")}`);
    if (team.role) teamReqs.push(`role: ${team.role}`);
    if (team.experience) teamReqs.push(`experience: ${team.experience}`);

    let prompt = `You are an expert technical recruiter.
Given the team requirements below, score each applicant on a scale of 0-100 how well they fit this team. Return only a JSON array of objects with keys: id (string), score (integer 0-100), and optional rationale (short string). Do NOT include any extra text outside the JSON array.

Team requirements:\n${teamReqs.length ? teamReqs.join("; \n") : "(no explicit structured requirements)"}
\nApplicants:\n`;

    for (const a of enriched) {
      prompt += `\nApplicant id: ${a.id}\n`;
      if (a.name) prompt += `name: ${a.name}\n`;
      if (a.email) prompt += `email: ${a.email}\n`;
      if (a.skills && a.skills.length) prompt += `skills: ${a.skills.join(", ")}\n`;
      if (a.resumeText) {
        // only include first ~4000 chars to avoid huge prompts
        const excerpt = a.resumeText.slice(0, 4000);
        prompt += `resume (excerpt): ${excerpt}\n`;
      } else if (a.resumeUrl) {
        prompt += `resume_url: ${a.resumeUrl} (failed to fetch or binary)\n`;
      }
    }

    // Call Gemini/Generative API — URL and key configurable via env
    const GEMINI_URL = process.env.GEMINI_API_URL || "https://generative.googleapis.com/v1/models/text-bison-001:predict";
    const body = {
      instances: [{ content: prompt }],
      // parameters can be tuned if needed
      parameters: { maxOutputTokens: 800 },
    };

    let resp;
    try {
      resp = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
      },
      body: JSON.stringify(body),
      });
    } catch (fetchErr: any) {
      console.error("Gemini fetch error:", fetchErr);
      return NextResponse.json({ error: "Gemini fetch error", details: String(fetchErr) }, { status: 502 });
    }

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error("Gemini API returned non-OK", { status: resp.status, url: GEMINI_URL, body: txt });
      return NextResponse.json({ error: "Gemini API error", details: txt, status: resp.status, url: GEMINI_URL }, { status: resp.status });
    }

    const data = await resp.json();

    // attempt to extract text output from common response shapes
    let textOut = "";
    if (Array.isArray(data?.candidates) && data.candidates[0]?.content) textOut = data.candidates[0].content;
    else if (Array.isArray(data?.predictions) && typeof data.predictions[0] === "string") textOut = data.predictions[0];
    else if (Array.isArray(data?.output) && data.output[0]?.content) textOut = data.output[0].content;
    else textOut = JSON.stringify(data);

    // try to parse JSON from model output
    try {
      const parsed = JSON.parse(textOut);
      return NextResponse.json({ scores: parsed });
    } catch (e) {
      // attempt to extract first JSON-looking substring
      const m = textOut.match(/(\[\s*\{[\s\S]*\}\s*\])/m);
      if (m) {
        try {
          const parsed = JSON.parse(m[0]);
          return NextResponse.json({ scores: parsed });
        } catch (e) {
          // fallthrough
        }
      }
      return NextResponse.json({ error: "Could not parse model output", raw: textOut }, { status: 502 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
