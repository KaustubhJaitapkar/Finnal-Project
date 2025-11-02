"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Application = {
  id: string
  status: string
  createdAt: string
  user: { id: string; name?: string; email?: string; resumeUrl?: string }
  post: { id: string; hackathonName?: string }
}

export default function ApplicationsPage() {
  const params = useParams() as { id: string }
  const id = params?.id
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    // fetch owner applications for postId = id
    fetch(`/api/applications/owner?postId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.applications) setApplications(d.applications)
        else setError(d?.error || 'No applications')
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [id])

  async function updateStatus(appId: string, status: 'ACCEPTED' | 'REJECTED') {
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed')
      setApplications((s) => s.map(a => a.id === appId ? { ...a, status } : a))
    } catch (err: any) {
      setError(err.message || String(err))
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Applications</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}

      <ul className="space-y-3">
        {applications.map((a) => (
          <li key={a.id} className="p-3 border rounded">
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{a.user?.name || a.user?.email}</div>
                <div className="text-sm">Applied: {new Date(a.createdAt).toLocaleString()}</div>
                <div className="text-sm">Status: {a.status}</div>
              </div>
              <div className="space-x-2">
                <button onClick={() => updateStatus(a.id, 'ACCEPTED')}>Accept</button>
                <button onClick={() => updateStatus(a.id, 'REJECTED')}>Reject</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
