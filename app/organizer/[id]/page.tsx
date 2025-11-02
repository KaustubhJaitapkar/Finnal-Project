"use client"

import React from 'react'
import Link from 'next/link'

export default function OrganizerManage({ params }: { params: { id: string } }){
  const { id } = params;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manage Hackathon</h1>
      <div className="flex gap-2 mb-4">
        <Link href={`/organizer/${id}/eligibility`} className="px-3 py-2 border rounded">Eligibility</Link>
        <Link href={`/organizer/${id}/applications`} className="px-3 py-2 border rounded">Applications</Link>
        <Link href={`/dashboard/findmember`} className="px-3 py-2 border rounded">Edit / View</Link>
      </div>
      <div>
        <p>Use the links above to manage eligibility and view applications for this hackathon.</p>
      </div>
    </div>
  )
}
