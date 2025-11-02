"use client";

import React, { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { RiExternalLinkFill } from "react-icons/ri";

type AppRow = {
    id: string;
    status: string;
    createdAt?: string;
    resumeUrl?: string | null;
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
        resumeUrl?: string | null;
    };
    post: {
        id: string;
        teamName?: string | null;
        hackathonName?: string | null;
        regURL?: string | null;
        user?: { id: string; name?: string | null; email?: string | null } | null;
    };
};

export function TableDemo() {
    const [rows, setRows] = useState<AppRow[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        // Fetch applications submitted by the current user
        fetch("/api/applications/mine")
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
    }, []);

    if (loading) return <div>Loading applications...</div>;
    if (error) return <div className="text-red-600">{error}</div>;
    if (!rows || rows.length === 0)
        return <div className="p-6">You have not applied to any teams yet.</div>;

    return (
        <Table className="border border-gray-500 dark:border-gray-800 lg:text-base ">
            <TableCaption>Teams / posts you applied to</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">S. No.</TableHead>
                    <TableHead>Team / Hackathon</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Visit Post</TableHead>
                    <TableHead className="text-right">Application Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((r, index) => {
                    const statusRaw = (r.status || "").toLowerCase();
                    const statusColor =
                        statusRaw === "accepted" ? "text-green-700" : statusRaw === "rejected" ? "text-red-500" : "text-gray-700 dark:text-gray-400";
                    const status = statusRaw ? statusRaw.substring(0, 1).toUpperCase() + statusRaw.substring(1) : "Pending";
                    const postLabel = r.post?.teamName || r.post?.hackathonName || "—";
                    const owner = r.post?.user?.name || r.post?.user?.email || "Owner";
                    const postLink = r.post?.regURL || `#/posts/${r.post?.id}`;

                    return (
                        <TableRow key={r.id} className="group">
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>{postLabel}</TableCell>
                            <TableCell>{owner}</TableCell>
                            <TableCell>
                                <Link href={postLink} target="_blank" className=" group-hover:text-primary transition-colors ease-linear flex justify-start items-center gap-2">
                                    View <span className="transition-color ease-linear "> <RiExternalLinkFill /> </span>
                                </Link>
                            </TableCell>
                            <TableCell className={` text-right ${statusColor} `}>
                                <span className=" dark:bg-gray-700/20 bg-gray-300/40 rounded-full px-2 py-1 text-xs shadow-sm "> {status} </span>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
