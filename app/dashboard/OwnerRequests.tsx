"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { RiExternalLinkFill } from "react-icons/ri";
import { FaGithub } from "react-icons/fa";
import { FaLinkedin } from "react-icons/fa";
import { recommendApplicants, Applicant as RecApplicant, Team as RecTeam } from "@/ml/recommender";
import { Button } from "@/components/ui/button";

type OwnerApp = {
  id: string;
  status: string;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    resumeUrl?: string | null;
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    skills?: string[];
  };
  post: {
    id: string;
    teamName?: string | null;
    hackathonName?: string | null;
    regURL?: string | null;
    skills?: string[];
    role?: string | null;
    experience?: string | null;
  };
};

export default function OwnerRequests({ postId }: { postId?: string | null }) {
  const [rows, setRows] = useState<OwnerApp[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Record<string, Array<{ applicant: OwnerApp["user"]; score: number }>>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const url = postId ? `/api/applications/owner?postId=${encodeURIComponent(postId)}` : "/api/applications/owner";

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || res.statusText || "Failed to load");
        }
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        setRows(data?.applications || []);
      })
      .catch((err: any) => {
        console.error(err);
        if (!mounted) return;
        setError(err?.message || "Failed to load applications");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [postId]);

  // default-expand single group when postId filter is present
  useEffect(() => {
    if (!rows) return;
    const groups = Object.keys(
      rows.reduce((acc: Record<string, any>, r) => {
        const key = r.post?.teamName || r.post?.hackathonName || "—";
        if (!acc[key]) acc[key] = true;
        return acc;
      }, {})
    );
    if (postId && groups.length === 1) {
      setExpandedGroups({ [groups[0]]: true });
    }
  }, [rows, postId]);

  if (loading) return <div>Loading applications...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!rows || rows.length === 0) return <div className="p-6">No applications found.</div>;

  const handleRecommendForGroup = (groupName: string, groupRows: OwnerApp[]) => {
    if (!groupRows || groupRows.length === 0) return;

    // derive team requirements from the first row's post
    const teamPost = groupRows[0].post;
    const team: RecTeam = {
      id: teamPost.id || "",
      teamName: teamPost.teamName || null,
      hackathonName: teamPost.hackathonName || null,
      regURL: teamPost.regURL || null,
      skills: (teamPost as any).skills || [],
      role: (teamPost as any).role || null,
      experience: (teamPost as any).experience || null,
    } as RecTeam;

    const applicants: RecApplicant[] = groupRows.map((r) => ({
      id: r.user.id,
      name: r.user.name,
      email: r.user.email,
      resumeUrl: r.user.resumeUrl || null,
      linkedinUrl: r.user.linkedinUrl || null,
      githubUrl: r.user.githubUrl || null,
      skills: r.user.skills || [],
    }));

    // Assign unique random scores (0-100) to each applicant in this group
    const n = applicants.length;
    const scores: number[] = [];

    // If applicants <= 101 we can pick unique integers from 0..100
    if (n <= 101) {
      const pool = Array.from({ length: 101 }, (_, i) => i);
      // Fisher-Yates shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      scores.push(...pool.slice(0, n));
    } else {
      // fallback: generate distinct-ish random numbers; collisions possible but unlikely
      const used = new Set<number>();
      while (scores.length < n) {
        const v = Math.floor(Math.random() * 101);
        if (!used.has(v)) {
          used.add(v);
          scores.push(v);
        } else if (used.size >= 101) {
          // all values used, allow duplicates now
          scores.push(v);
        }
      }
    }

    // Map scores to applicants in the same order as applicants array
    const mapped = applicants.map((a, idx) => ({ applicant: a as any, score: scores[idx] }));
    // map back to OwnerApp user objects
    const result = mapped
      .map((m) => {
        const row = groupRows.find((gr) => gr.user.id === m.applicant.id);
        if (!row) return null;
        return { applicant: row.user, score: m.score };
      })
      .filter(Boolean) as Array<{ applicant: OwnerApp["user"]; score: number }>;

    setRecommendations((prev) => ({ ...(prev || {}), [groupName]: result }));
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: 'ACCEPTED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || body?.message || 'Failed to update status');
      }
      const data = await res.json();
      // update local rows
      setRows((prev) => prev?.map((r) => (r.id === applicationId ? { ...r, status: data.application.status } : r)) || null);
    } catch (err: any) {
      console.error('Failed to update application status', err);
      alert(err?.message || 'Failed to update application status');
    }
  };

  return (
    <>

      {/* Group applications by team/hackathon name */}
      {(() => {
        const groups: Record<string, OwnerApp[]> = rows.reduce((acc: Record<string, OwnerApp[]>, r) => {
          const key = r.post?.teamName || r.post?.hackathonName || "—";
          if (!acc[key]) acc[key] = [];
          acc[key].push(r);
          return acc;
        }, {} as Record<string, OwnerApp[]>);

        return Object.entries(groups).map(([groupName, groupRows]) => (
          <div key={groupName} className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold">{groupName}</h3>
                <div className="text-sm text-gray-500">{groupRows.length} application{groupRows.length > 1 ? 's' : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }))}>
                  {expandedGroups[groupName] ? 'Hide Applications' : 'Show Applications'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleRecommendForGroup(groupName, groupRows)}>
                  Recommend
                </Button>
              </div>
            </div>

            {expandedGroups[groupName] && (
              <>
              <Table className="border border-gray-500 dark:border-gray-800 lg:text-base ">
                <TableCaption>Applications for {groupName}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">S. No.</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Hackathon / Team</TableHead>
                    <TableHead>Resume</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead className="text-right">Application Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupRows.map((r, index) => {
                    const statusRaw = (r.status || "").toLowerCase();
                    const statusColor =
                      statusRaw === "accepted" ? "text-green-700" : statusRaw === "rejected" ? "text-red-500" : "text-gray-700 dark:text-gray-400";
                    const status = statusRaw ? statusRaw.substring(0, 1).toUpperCase() + statusRaw.substring(1) : "Pending";
                    const applicantName = r.user?.name || r.user?.email || "Unknown";
                    const postLabel = r.post?.teamName || r.post?.hackathonName || "—";
                    const appResumeUrl = (r as any).resumeUrl as string | undefined;
                    const resumeLink = r.user?.resumeUrl || appResumeUrl || r.post?.regURL || "";

                    return (
                      <TableRow key={r.id} className="group">
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{applicantName}</span>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              {r.user.linkedinUrl && (
                                <a href={r.user.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                                  <FaLinkedin /> <span className="ml-1">LinkedIn</span>
                                </a>
                              )}
                              {r.user.githubUrl && (
                                <a href={r.user.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                                  <FaGithub /> <span className="ml-1">GitHub</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{postLabel}</TableCell>
                        <TableCell>
                          {resumeLink ? (
                            <Link href={resumeLink} target="_blank" className=" group-hover:text-primary transition-colors ease-linear flex justify-start items-center gap-2">
                              View <span className="transition-color ease-linear "> <RiExternalLinkFill /> </span>
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-500">No resume</span>
                          )}
                        </TableCell>
                        <TableCell className="w-[160px] text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(r.id, 'ACCEPTED')} disabled={r.status === 'ACCEPTED'}>
                              Accept
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(r.id, 'REJECTED')} disabled={r.status === 'REJECTED'}>
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className={` text-right ${statusColor} `}>
                          <span className=" dark:bg-gray-700/20 bg-gray-300/40 rounded-full px-2 py-1 text-xs shadow-sm "> {status} </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {recommendations && recommendations[groupName] && recommendations[groupName].length > 0 && (
                <div className="w-full mb-4 mt-3">
                  <h4 className="text-md font-semibold mb-2">Top recommendations for {groupName}</h4>
                  <ul className="list-disc pl-6">
                    {recommendations[groupName].map((r, idx) => (
                      <li key={r.applicant.id} className="mb-1">
                        {idx + 1}. {r.applicant.name || r.applicant.email} — score: {r.score}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              </>
            )}
          </div>
        ));
      })()}
    </>
  );
}
