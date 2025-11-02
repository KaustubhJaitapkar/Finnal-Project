"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function AnalyticsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/hackathons/${id}/analytics`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load analytics');
        return res.json();
      })
      .then((d) => { if (!mounted) return; setData(d); })
      .catch((err:any) => { if (!mounted) return; setError(err.message || 'Failed'); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="p-6">Loading analytics…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6">No data</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Hackathon analytics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 border rounded">
          <div className="text-sm text-gray-500">Total applications</div>
          <div className="text-2xl font-bold">{data.total}</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-gray-500">Accepted</div>
          <div className="text-2xl font-bold text-green-600">{data.accepted}</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold">{data.pending}</div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Top applicant skills</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {data.topSkills && data.topSkills.length > 0 ? data.topSkills.map((s:any)=> (
            <div key={s.skill} className="p-2 border rounded">
              <div className="font-medium">{s.skill}</div>
              <div className="text-sm text-gray-500">{s.count} applicants</div>
            </div>
          )) : <div>No skill data</div>}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Average overlap with required skills</h3>
        <div>{data.averageOverlap === null ? 'No required skills defined' : `${data.averageOverlap.toFixed(2)} skills on average`}</div>
      </div>
    </div>
  );
}
