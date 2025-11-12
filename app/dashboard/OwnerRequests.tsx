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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

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
  const [recommendations, setRecommendations] = useState<Record<string, Array<{ applicant: OwnerApp["user"]; score?: number; matchedSkills?: string[]; ratedSkills?: Record<string, number> }>>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OwnerApp['user'] | null>(null);

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

  const handleRecommendForGroup = async (groupName: string, groupRows: OwnerApp[]) => {
    if (!groupRows || groupRows.length === 0) return;

    // derive team requirements from the first row's post
    const teamPost = groupRows[0].post;
    const team = {
      id: teamPost.id || "",
      teamName: teamPost.teamName || null,
      hackathonName: teamPost.hackathonName || null,
      regURL: teamPost.regURL || null,
      skills: (teamPost as any).skills || [],
      role: (teamPost as any).role || null,
      experience: (teamPost as any).experience || null,
    };

    const applicants = groupRows.map((r) => ({
      id: r.user.id,
      name: r.user.name,
      email: r.user.email,
      resumeUrl: r.user.resumeUrl || ((r as any).resumeUrl as string | undefined) || null,
      linkedinUrl: r.user.linkedinUrl || null,
      githubUrl: r.user.githubUrl || null,
      skills: r.user.skills || [],
    }));

    try {
      setLoading(true);
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team, applicants }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || body?.message || 'Recommendation failed');
      }
      const data = await res.json();
      // expected shape: { recommendations: Array<{ applicantId, score, details }>, top3: Array<applicantId> }
      const result = (data.recommendations || []).map((r: any) => {
        const row = groupRows.find((gr) => gr.user.id === r.applicantId);
        return row
          ? {
              applicant: row.user,
              score: typeof r.score === 'number' ? r.score : undefined,
              matchedSkills: Array.isArray(r.matchedSkills) ? r.matchedSkills : undefined,
              ratedSkills: r.ratedSkills && typeof r.ratedSkills === 'object' ? r.ratedSkills : undefined,
            }
          : null;
      }).filter(Boolean) as Array<{ applicant: OwnerApp['user']; score?: number; matchedSkills?: string[]; ratedSkills?: Record<string, number> }>;

      setRecommendations((prev) => ({ ...(prev || {}), [groupName]: result }));
    } catch (err: any) {
      console.error('Recommendation failed', err);
      alert(err?.message || 'Recommendation failed');
    } finally {
      setLoading(false);
    }
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(r.user || null);
                                setDialogOpen(true);
                              }}
                            >
                              View Profile
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

              {/* Applicant profile dialog */}
              <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setSelectedUser(null); setDialogOpen(open); }}>
                <DialogContent className="sm:max-w-[520px]">
                  <DialogHeader>
                    <DialogTitle>Applicant profile</DialogTitle>
                    <DialogDescription>Details for the selected applicant.</DialogDescription>
                  </DialogHeader>

                  {selectedUser ? (
                    <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                      <div>
                        <div className="text-xs text-gray-500">Name</div>
                        <div className="font-medium">{selectedUser.name || '—'}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">User ID</div>
                        <div className="font-mono text-xs">{selectedUser.id}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Email</div>
                        <div>{selectedUser.email || '—'}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Skills</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {(selectedUser.skills || []).length > 0 ? (
                            (selectedUser.skills || []).map((s, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">{s}</span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No skills listed</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {selectedUser.resumeUrl && (
                          <a href={selectedUser.resumeUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                            View resume
                          </a>
                        )}
                        {selectedUser.linkedinUrl && (
                          <a href={selectedUser.linkedinUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
                            LinkedIn profile
                          </a>
                        )}
                        {selectedUser.githubUrl && (
                          <a href={selectedUser.githubUrl} target="_blank" rel="noreferrer" className="text-sm text-gray-700 underline">
                            GitHub profile
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>No applicant selected.</div>
                  )}
                </DialogContent>
              </Dialog>

              {recommendations && recommendations[groupName] && recommendations[groupName].length > 0 && (
                <div className="w-full mb-4 mt-3">
                  <h4 className="text-md font-semibold mb-2">Top recommendations for {groupName}</h4>
                    <div className="space-y-3">
                      {recommendations[groupName].map((r, idx) => (
                        <div key={r.applicant.id} className="p-3 rounded border border-gray-200 dark:border-gray-800">
                          <div className="flex items-start justify-between">
                            <div className="font-medium">{idx + 1}. {r.applicant.name || r.applicant.email}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{typeof r.score === 'number' ? `Score: ${r.score}` : 'Score: —'}</div>
                          </div>

                          {/* Matched skills badges */}
                          {r.matchedSkills && r.matchedSkills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {r.matchedSkills.map((s, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">{s}</span>
                              ))}
                            </div>
                          )}

                          {/* Rated skills breakdown */}
                          {r.ratedSkills && Object.keys(r.ratedSkills).length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs text-gray-500 mb-1">Skill ratings</div>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(r.ratedSkills).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).map(([skill, val]) => (
                                  <div key={skill} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">
                                    <div className="truncate">{skill}</div>
                                    <div className="ml-2 font-mono text-xs">{Math.round(Number(val))}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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
