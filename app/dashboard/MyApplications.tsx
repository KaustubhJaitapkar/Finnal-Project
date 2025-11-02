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

type MineApp = {
  id: string;
  status: string;
  post: {
    id: string;
    teamName?: string | null;
    hackathonName?: string | null;
    regURL?: string | null;
    user?: { id: string; name?: string | null; email?: string | null } | null;
  };
};

type ReceivedApp = {
  id: string;
  status: string;
  user: { id: string; name?: string | null; email?: string | null; resumeUrl?: string | null };
  post: { id: string; teamName?: string | null; hackathonName?: string | null; regURL?: string | null };
};

export default function MyApplications() {
  const [mine, setMine] = useState<MineApp[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetch("/api/applications/mine")
      .then(async (res) => {
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b?.error || res.statusText || "Failed to load");
        }
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        setMine(data?.applications || []);
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
  }, []);

  if (loading) return <div>Loading your applications…</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="w-full">
      {/* Mine (submitted applications) */}
      {mine && mine.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold mb-4">Applications you submitted</h2>
          <Table className="border border-gray-500 dark:border-gray-800 lg:text-base ">
            <TableCaption>Your applications</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">S. No.</TableHead>
                <TableHead>Team / Hackathon</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Visit Post</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mine.map((r, i) => {
                const s = (r.status || "").toLowerCase();
                const statusColor = s === "accepted" ? "text-green-700" : s === "rejected" ? "text-red-500" : "text-gray-700 dark:text-gray-400";
                const statusLabel = s ? s.charAt(0).toUpperCase() + s.slice(1) : "Pending";
                const postLabel = r.post?.teamName || r.post?.hackathonName || "—";
                const owner = r.post?.user?.name || r.post?.user?.email || "Owner";
                const postUrl = r.post?.regURL || `#/posts/${r.post?.id}`;

                return (
                  <TableRow key={r.id} className="group">
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>{postLabel}</TableCell>
                    <TableCell>{owner}</TableCell>
                    <TableCell>
                      <Link href={postUrl} target="_blank" className=" flex items-center gap-2">
                        View <RiExternalLinkFill />
                      </Link>
                    </TableCell>
                    <TableCell className={` text-right ${statusColor} `}>
                      <span className=" dark:bg-gray-700/20 bg-gray-300/40 rounded-full px-2 py-1 text-xs shadow-sm "> {statusLabel} </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      ) : (
        <section>
          <h2 className="text-lg font-semibold mb-2">Applications you submitted</h2>
          <p className="text-sm text-gray-500">You have not applied to any teams yet.</p>
        </section>
      )}
    </div>
  );
}
