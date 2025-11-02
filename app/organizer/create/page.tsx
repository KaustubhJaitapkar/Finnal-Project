"use client"

import React from 'react'
import dynamic from 'next/dynamic'

const Form = dynamic(() => import('@/app/(dashboard)/(routes)/findmember/Form/Form'), { ssr: false }) as any;

export default function CreatePage(){
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Create Hackathon</h1>
      <Form />
    </div>
  )
}
