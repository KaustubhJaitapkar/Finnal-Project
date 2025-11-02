export type Applicant = {
  id: string;
  name?: string | null;
  email?: string | null;
  resumeUrl?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  skills?: string[];
};

export type Team = {
  id: string;
  teamName?: string | null;
  hackathonName?: string | null;
  regURL?: string | null;
  skills?: string[];
  role?: string | null;
  experience?: string | null;
};

// Simple recommender: score applicants by skill overlap and presence of profile/resume links.
// Score = overlapCount * 10 + hasResume*5 + hasLinkedin*2 + hasGithub*2
// Returns applicants sorted descending by score; limited to topN
export function recommendApplicants(team: Team, applicants: Applicant[], topN = 5) {
  if (!team || !team.skills || team.skills.length === 0) {
    // if team has no explicit skill requirements, fallback to presence-based ranking
    const scored = applicants.map((a) => ({
      applicant: a,
      score: (a.resumeUrl ? 5 : 0) + (a.linkedinUrl ? 2 : 0) + (a.githubUrl ? 2 : 0),
    }));
    scored.sort((x, y) => y.score - x.score);
    return scored.slice(0, topN).map((s) => ({ applicant: s.applicant, score: s.score }));
  }

  const required = team.skills!.map((s) => s.toLowerCase().trim());

  const scored = applicants.map((a) => {
    const as = (a.skills || []).map((s) => s.toLowerCase().trim());
    let overlap = 0;
    for (const r of required) {
      if (as.includes(r)) overlap++;
    }

    const score = overlap * 10 + (a.resumeUrl ? 5 : 0) + (a.linkedinUrl ? 2 : 0) + (a.githubUrl ? 2 : 0);
    return { applicant: a, score };
  });

  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, topN).map((s) => ({ applicant: s.applicant, score: s.score }));
}
