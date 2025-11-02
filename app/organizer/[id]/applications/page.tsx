"use client"

import React, { useEffect, useState } from 'react'

export default function OrganizerApplications({ params }: { params: { id: string } }){
  const id = params.id;
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(()=>{
    let mounted = true;
    const url = `/api/applications/owner?postId=${encodeURIComponent(id)}`;
    fetch(url)
      .then(async (res)=>{ if(!res.ok) throw new Error('Failed to load'); return res.json() })
      .then((d)=>{ if(!mounted) return; setItems(d.applications || []) })
      .catch((e:any)=>{ if(!mounted) return; setError(e.message || 'Failed') })
      .finally(()=>{ if(mounted) setLoading(false) })
    return ()=>{ mounted = false }
  }, [id])

  if (loading) return <div>Loading applications...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!items || items.length === 0) return <div>No applications yet.</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Applications</h1>
      <ul className="space-y-3">
        {items.map((app:any)=> (
          <li key={app.id} className="p-3 border rounded">
            <div className="font-semibold">Applicant: {app.user?.name || app.candidateId}</div>
            <div className="text-sm">Email: {app.user?.email}</div>
            <div className="text-sm">LinkedIn: {app.linkedinUrl || app.user?.linkedinUrl || '—'}</div>
            <div className="text-sm">GitHub: {app.githubUrl || app.user?.githubUrl || '—'}</div>
            <div className="mt-2"><a className="text-blue-600" href={app.resumeUrl || app.user?.resumeUrl || '#'} target="_blank">View resume</a></div>
          </li>
        ))}
      </ul>
    </div>
  )
}
