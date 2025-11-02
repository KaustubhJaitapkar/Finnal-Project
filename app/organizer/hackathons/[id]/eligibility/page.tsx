"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function EligibilityPage() {
  const params = useParams() as { id: string }
  const id = params?.id
  const [criteria, setCriteria] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/hackathons/${id}/eligibility`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.criteria) setCriteria(JSON.stringify(d.criteria, null, 2))
      })
      .catch((e) => setMessage(String(e)))
      .finally(() => setLoading(false))
  }, [id])

  async function save() {
    setLoading(true)
    setMessage(null)
    try {
      const parsed = JSON.parse(criteria || '{}')
      const res = await fetch(`/api/hackathons/${id}/eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria: parsed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed')
      setMessage('Saved')
    } catch (err: any) {
      setMessage(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Eligibility Criteria</h2>
      {loading && <div>Loading...</div>}
      <p className="mb-2 text-sm text-muted-foreground">Edit JSON criteria for eligibility (example: {`{"minAge":18, "college":"ABC"}`}).</p>
      <textarea value={criteria} onChange={(e) => setCriteria(e.target.value)} rows={10} className="w-full mb-2" />
      <div className="flex items-center space-x-2">
        <button onClick={save} disabled={loading}>Save</button>
        {message && <span className="text-sm">{message}</span>}
      </div>
    </div>
  )
}
