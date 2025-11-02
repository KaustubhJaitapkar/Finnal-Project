"use client"

import React from 'react'
import dynamic from 'next/dynamic'

// reuse the existing Form used for findmember/team creation
const Form = dynamic(() => import('@/app/(dashboard)/(routes)/findmember/Form/Form'), { ssr: false }) as any;

export default function CreateHackathonPage(){
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Create a Hackathon / Team Post</h1>
      <Form />
    </div>
  )
}
