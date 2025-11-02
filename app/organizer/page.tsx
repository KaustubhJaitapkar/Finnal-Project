"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'

type Hackathon = {
  id: string
  hackathonName: string
  regDate?: string
  memberCount?: string
  createdAt: string
}

export default function OrganizerIndex() {
  const [hackathons, setHackathons] = useState<Hackathon[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetch('/api/hackathons/owned')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then((d) => {
        if (!mounted) return
        setHackathons(d.hackathons || [])
      })
      .catch((e: any) => {
        if (!mounted) return
        setError(e.message || 'Failed')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!hackathons || hackathons.length === 0)
    return (
      <div className="p-6">
        No hackathons found. <Link href="/organizer/new-hackathon" className="text-blue-600">Create one</Link>
      </div>
    )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Organizer portal</h1>
      <div className="mb-4">
        <Link href="/organizer/new-hackathon" className="px-3 py-2 bg-blue-600 text-white rounded">Create hackathon</Link>
      </div>
      <ul className="space-y-3">
        {hackathons.map(h => (
          <li key={h.id} className="border p-4 rounded flex justify-between items-center">
            <div>
              <div className="font-semibold">{h.hackathonName}</div>
              <div className="text-sm text-gray-500">Reg date: {h.regDate ? new Date(h.regDate).toLocaleDateString() : '—'}</div>
            </div>
            <div className="flex gap-2">
              <Link href={`/organizer/hackathons/${h.id}/eligibility`} className="px-3 py-1 border rounded">Eligibility</Link>
              <Link href={`/organizer/hackathons/${h.id}/applications`} className="px-3 py-1 border rounded">Applications</Link>
              <Link href={`/organizer/hackathons/${h.id}`} className="px-3 py-1 border rounded">Manage</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
