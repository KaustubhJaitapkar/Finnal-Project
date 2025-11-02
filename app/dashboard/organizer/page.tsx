"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function OrganizerDashboard() {
  const [hackathons, setHackathons] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('/api/hackathons/owned')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data) => { if (!mounted) return; setHackathons(data.hackathons || []); })
      .catch((err:any) => { if (!mounted) return; setError(err.message || 'Failed'); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, []);

  if (loading) return <div>Loading your hackathons...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!hackathons || hackathons.length === 0) return <div>You don't have any hackathons yet.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Organizer dashboard</h1>
      <div className="flex gap-2 mb-4">
        <Link href={`/dashboard/organizer/create`} className="px-3 py-1 bg-blue-600 text-white rounded">Create hackathon</Link>
        <button onClick={async ()=>{
          try {
            const res = await fetch('/api/hackathons/verify-due', { method: 'POST' });
            if (!res.ok) throw new Error('Failed');
            const d = await res.json();
            alert(`Verification run for ${d.processedCount || 0} hackathons`);
            window.location.reload();
          } catch (e:any) { alert(e?.message || 'Failed'); }
        }} className="px-3 py-1 border rounded">Run verification for due hackathons</button>
      </div>
      <ul className="space-y-3">
        {hackathons.map((h:any) => (
          <li key={h.id} className="border p-4 rounded">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">{h.teamName} — {h.hackathonName}</div>
                <div className="text-sm text-gray-500">Role: {h.role} • Skills: {h.skills?.join(', ')}</div>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/organizer/${h.id}`} className="px-3 py-1 border rounded bg-gray-50">Manage eligibility</Link>
                <Link href={`/dashboard/organizer/${h.id}/analytics`} className="px-3 py-1 border rounded bg-gray-50">Analytics</Link>
                <Link href={`/dashboard/findmember`} className="px-3 py-1 border rounded bg-gray-50">Edit / View</Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
