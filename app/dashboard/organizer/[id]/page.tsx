"use client";

import React, { useEffect, useState } from 'react';
import EligibilityForm from '@/components/organizer/EligibilityForm';
import { useRouter } from 'next/navigation';

export default function ManageEligibility({ params }: { params: { id: string } }) {
  const { id } = params;
  const [criteriaText, setCriteriaText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyResults, setVerifyResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/hackathons/${id}/eligibility`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => { if (!mounted) return; setCriteriaText(JSON.stringify(data.criteria || { requiredSkills: [], allowedEmailDomains: [], minOverlap: 0 }, null, 2)); })
      .catch((err:any) => { if (!mounted) return; setError(err.message || 'Failed'); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = { criteria: JSON.parse(criteriaText) };
      const res = await fetch(`/api/hackathons/${id}/eligibility`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Save failed');
      // refresh
      router.refresh();
      alert('Saved');
    } catch (err:any) {
      setError(err.message || 'Save error');
    } finally { setSaving(false); }
  }

  async function runVerify(autoAccept=false) {
    setError(null);
    setVerifyResults(null);
    try {
      const res = await fetch(`/api/hackathons/${id}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ autoAccept }) });
      if (!res.ok) throw new Error('Verify failed');
      const data = await res.json();
      setVerifyResults(data.results || []);
    } catch (err:any) {
      setError(err.message || 'Verify error');
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-2">Manage eligibility</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="mb-4">
          <label className="block mb-1">Eligibility Form</label>
          <EligibilityForm hackathonId={id} />
      </div>
      <div className="flex gap-2 mb-6">
          <button onClick={save} disabled={saving} className="px-3 py-1 bg-blue-600 text-white rounded">{saving ? 'Saving...' : 'Save (raw)'}</button>
        <button onClick={()=>runVerify(false)} className="px-3 py-1 border rounded">Run verification</button>
        <button onClick={()=>runVerify(true)} className="px-3 py-1 border rounded bg-green-50">Run & auto-accept</button>
      </div>
        <div className="mt-6">
          <h4 className="font-medium mb-2">Raw JSON (read-only)</h4>
          <pre className="p-3 bg-gray-50 rounded text-sm">{JSON.stringify(JSON.parse(criteriaText), null, 2)}</pre>
        </div>

      {verifyResults && (
        <div>
          <h3 className="font-semibold mb-2">Results</h3>
          <ul className="space-y-2">
            {verifyResults.map((r:any)=> (
              <li key={r.applicationId} className="p-2 border rounded">
                <div className="font-medium">Applicant: {r.applicantId} — Eligible: {r.eligible ? 'Yes' : 'No'}</div>
                <div className="text-sm text-gray-600">Reasons: {r.reasons?.join(', ') || '—'}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
