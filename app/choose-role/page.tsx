"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaUsers, FaUserTie } from 'react-icons/fa';

export default function ChooseRolePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  function onOrganizer() {
    if (status === 'authenticated' && session?.user) {
      router.push('/organizer');
    } else {
      router.push('/login?role=organizer');
    }
  }

  function onParticipant() {
    if (status === 'authenticated' && session?.user) {
      // If already signed in, send to teams listing
      router.push('/dashboard/profile');
    } else {
      router.push('/login?role=participant');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-slate-0 dark:to-slate-800 p-6">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight">How would you like to continue?</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Choose a role to get the best experience — Participant to join teams, Organizer to create and manage hackathons.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          <button
            onClick={onParticipant}
            className="flex items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-105 transform-gpu transition duration-200 shadow-lg border border-transparent focus:outline-none focus:ring-4 focus:ring-indigo-300/40"
            aria-label="Continue as participant"
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-md bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
              <FaUsers className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-lg">Participant</h4>
              <p className="text-sm opacity-90">Apply to teams, manage applications and find collaborators.</p>
            </div>
            
          </button>

          <button
            onClick={onOrganizer}
            className="flex items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:scale-105 transform-gpu transition duration-200 shadow-lg border border-transparent focus:outline-none focus:ring-4 focus:ring-emerald-300/40"
            aria-label="Continue as organizer"
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-md bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
              <FaUserTie className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-lg">Organizer</h4>
              <p className="text-sm opacity-90">Create and manage hackathons, review applicants and verify participants.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
