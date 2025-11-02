"use client";

import React, { useEffect, useState } from 'react';

type Props = { hackathonId: string };

export default function EligibilityForm({ hackathonId }: Props) {
  const [requiredSkills, setRequiredSkills] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [minOverlap, setMinOverlap] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/hackathons/${hackathonId}/eligibility`)
      .then(async (res) => { if (!res.ok) throw new Error('fetch failed'); return res.json(); })
      .then((d) => {
        if (!mounted) return;
        const c = d?.criteria || {};
        setRequiredSkills((c.requiredSkills || []).join(', '));
        setAllowedDomains((c.allowedEmailDomains || []).join(', '));
        setMinOverlap(typeof c.minOverlap === 'number' ? c.minOverlap : '');
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [hackathonId]);

  async function save() {
    setSaving(true); setMessage(null);
    try {
      const criteria = {
        requiredSkills: requiredSkills.split(',').map(s=>s.trim()).filter(Boolean),
        allowedEmailDomains: allowedDomains.split(',').map(s=>s.trim()).filter(Boolean),
        minOverlap: typeof minOverlap === 'number' ? minOverlap : (requiredSkills ? requiredSkills.split(',').map(s=>s.trim()).filter(Boolean).length : 0)
      };
      const res = await fetch(`/api/hackathons/${hackathonId}/eligibility`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ criteria }) });
      if (!res.ok) throw new Error('save failed');
      setMessage('Saved');
    } catch (err:any) {
      setMessage(err?.message || 'Save error');
    } finally { setSaving(false); }
  }

  return (
    <div className="p-4 border rounded">
      <h4 className="font-semibold mb-2">Eligibility (structured)</h4>
      <label className="block text-sm mb-1">Required skills (comma separated)</label>
      <input value={requiredSkills} onChange={(e)=>setRequiredSkills(e.target.value)} className="w-full p-2 border rounded mb-3" />

      <label className="block text-sm mb-1">Allowed email domains (comma separated)</label>
      <input value={allowedDomains} onChange={(e)=>setAllowedDomains(e.target.value)} className="w-full p-2 border rounded mb-3" />

      <label className="block text-sm mb-1">Minimum overlap (number)</label>
      <input value={minOverlap as any} onChange={(e)=>setMinOverlap(e.target.value === '' ? '' : Number(e.target.value))} type="number" min={0} className="w-40 p-2 border rounded mb-3" />

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded">{saving ? 'Saving...' : 'Save'}</button>
        <button onClick={async ()=>{ setMessage(null); try { const r = await fetch(`/api/hackathons/${hackathonId}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ autoAccept: false }) }); const d = await r.json(); setMessage('Verification run: '+ (d?.results?.length ?? 0) + ' applicants evaluated'); } catch(e){ setMessage('Verify failed') } }} className="px-3 py-2 border rounded">Run verification</button>
      </div>
      {message && <div className="mt-2 text-sm text-gray-700">{message}</div>}
    </div>
  )
}
