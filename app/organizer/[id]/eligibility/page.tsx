"use client"

import React from 'react'
import EligibilityForm from '@/components/organizer/EligibilityForm'

export default function OrganizerEligibility({ params }: { params: { id: string } }){
  const id = params.id;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Eligibility for hackathon</h1>
      <EligibilityForm hackathonId={id} />
    </div>
  )
}
