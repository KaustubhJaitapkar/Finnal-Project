"use client";

import React, { useEffect, useRef, useState } from 'react'
import { AnimatedShinyTextDemo } from './AnimatedShinyTextDemo'
import RetroGrid from '@/components/magicui/retro-grid'
import { Button } from '@/components/ui/button'
import { FaSearch } from "react-icons/fa";
import { FaAngleRight } from "react-icons/fa6";
import Link from 'next/link'
import Image from 'next/image';
import ProductHunt from './ProductHunt';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';


const Hero = () => {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const router = useRouter();
	const { data: session, status } = useSession();

	useEffect(() => {
		function onDoc(e: MouseEvent) {
			if (!menuRef.current) return;
			if (!(e.target instanceof Node)) return;
			if (!menuRef.current.contains(e.target)) setMenuOpen(false);
		}

		document.addEventListener('click', onDoc);
		return () => document.removeEventListener('click', onDoc);
	}, []);
	return (
		<div className='w-full min-h-[90vh] pt-20 relative flex flex-col justify-normal items-center gap-4 ' >
			{/* <AnimatedShinyTextDemo/> */}
			<div className=' relative w-full h-full flex flex-col px-2 sm:px-0 justify-normal items-center gap-4 overflow-hidden z-[1] '>
				<h1 className="bg-gradient-to-br dark:from-white from-[#6254f4] from-30% dark:to-white/40 to-[#056fcc]/40 bg-clip-text py-6  font-semibold leading-none tracking-tighter text-transparent text-balance text-4xl sm:text-5xl md:text-6xl lg:text-7xl translate-y-[-1rem] animate-fade [--animation-delay:500ms] text-center ">Build Your Dream <br className="hidden md:block"/>  <span className=' text-5xl sm:text-6xl md:text-7xl lg:text-8xl z-[1]  '>Hackathon Team</span></h1>
				
				<p className="mb-12 text-lg tracking-tight text-gray-800 dark:text-gray-400 md:text-xl text-balance translate-y-[-1rem] animate-fade-in   z-[1]
				[--animation-delay:400ms] text-center "> Connect with skilled developers around the world to build winning hackathon teams.
				<br className="block"/> 
				Leverage your skills, collaborate with experts, and turn your innovative ideas into reality.
				</p>

				<div className=' -mt-8 flex sm:flex-row flex-col justify-center items-center gap-5 z-[1] '>
					<div>
						<button onClick={() => { setMenuOpen(false); router.push('/choose-role'); }} aria-expanded={menuOpen} className=" group dark:hover:shadow-[0_4px_14px_0_rgba(20,_243,_232,_0.2)] hover:shadow-[0_6px_20px_rgba(20,_79,_243,_0.5)] px-8 py-3 rounded-md text-white dark:text-slate-900 font-semibold text-lg transition duration-200 ease-linear bg-[rgb(20,175,255)] bg-gradient-to-br dark:from-[rgba(20,175,255,1)] dark:to-rgba(39,116,254,1) from-[rgba(0,198,255,1)] to-[rgba(0,91,255,1)] flex justify-center items-center gap-1 active:outline  active:outline-offset-2 active:outline-2 active:outline-white">
						Get Started
						<FaAngleRight className=' group-hover:translate-x-1 transition-transform text-sm '/>
						</button>
					</div>
					{/* <Link href={'/teams'} target='_blank' >					
						<Button className=" group shadow-[0_4px_14px_0_rgb(0,0,0,10%)] hover:shadow-[0_6px_20px_rgba(93,93,93,23%)]  px-8 py-6 rounded-md text-gray-900 dark:text-gray-800 font-semibold text-lg bg-transparent border-2 dark:border-0 border-secondary dark:bg-[#f2f2f2] hover:bg-transparent transition duration-200 ease-linear flex justify-center items-center gap-1 ">
							Find Teams
							<FaSearch className=' text-sm '/>
						</Button>
					</Link> */}
				</div>

				<RetroGrid/>

				{/* Role chooser modal - visible and centered when menuOpen is true */}
				{menuOpen && (
					<div className="fixed inset-0 z-60 flex items-center justify-center">
						<div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
						<div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-[min(640px,90%)] p-6 z-70">
							<h3 className="text-xl font-semibold mb-3">How would you like to continue?</h3>
							<p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Choose whether you want to use the site as a Participant (apply to teams) or as an Organizer (create/manage hackathons).</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<button onClick={() => { setMenuOpen(false); router.push('/login?role=participant'); }} className="p-4 border rounded hover:shadow-md text-left">
									<h4 className="font-semibold">Participant</h4>
									<p className="text-sm text-gray-600">Apply to teams, manage applications and find collaborators.</p>
								</button>
								<button onClick={() => {
									setMenuOpen(false);
									// If user is authenticated, go straight to organizer dashboard
									if (status === 'authenticated' && session?.user) {
										router.push('/organizer');
									} else {
										router.push('/login?role=organizer');
									}
								}} className="p-4 border rounded hover:shadow-md text-left">
									<h4 className="font-semibold">Organizer</h4>
									<p className="text-sm text-gray-600">Create and manage hackathons, review applicants and verify participants.</p>
								</button>
							</div>
							<div className="mt-4 text-right">
								<button onClick={() => setMenuOpen(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
							</div>
						</div>
					</div>
				)}
				{/* <div className=" absolute inset-0 bottom-0 w-full h-full  bg-gradient-to-b from-transparent via-transparent   to-background  " >
				</div> */}

			</div>
		</div>
	)
}

export default Hero
