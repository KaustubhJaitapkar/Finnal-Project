import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Organizer Dashboard',
}

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Organizer Dashboard</h1>
        <nav className="mt-3 space-x-4">
          <Link href="/organizer">Home</Link>
          <Link href="/organizer/new-hackathon">Post Hackathon</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
