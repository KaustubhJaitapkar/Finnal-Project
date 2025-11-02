"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewHackathon() {
  const router = useRouter()
  const [form, setForm] = useState({
    hackathonName: '',
    regURL: '',
    hackathonMode: '',
    memberCount: '',
    regDate: '',
    location: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      hackathonName: form.hackathonName,
      regURL: form.regURL,
      hackathonMode: form.hackathonMode,
      memberCount: form.memberCount,
      regDate: form.regDate,
      location: form.location,
      description: form.description,
    }

    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create')
      // navigate to organizer home
      router.push('/organizer')
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Post a Hackathon</h2>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-xl">
        <input name="hackathonName" placeholder="Hackathon name" value={form.hackathonName} onChange={updateField} className="w-full" />
        <input name="regURL" placeholder="Registration URL" value={form.regURL} onChange={updateField} className="w-full" />
        <input name="regDate" type="date" placeholder="Registration date" value={form.regDate} onChange={updateField} className="w-full" />
        <input name="location" placeholder="Location" value={form.location} onChange={updateField} className="w-full" />
        <input name="memberCount" placeholder="Member count" value={form.memberCount} onChange={updateField} className="w-full" />
        <input name="hackathonMode" placeholder="Mode (online/offline)" value={form.hackathonMode} onChange={updateField} className="w-full" />
        
        <textarea name="description" placeholder="Description" value={form.description} onChange={updateField} className="w-full" />

        {error && <div className="text-red-600">{error}</div>}
        <div>
          <button type="submit" disabled={loading}>{loading ? 'Posting...' : 'Post Hackathon'}</button>
        </div>
      </form>
    </div>
  )
}
