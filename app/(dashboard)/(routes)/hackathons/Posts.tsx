'use client';

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import unstop from '@/app/assets/unstop.png'
import devpost from '@/app/assets/devpost.svg'
import devfolio from '@/app/assets/Devfolio.svg'
import HackLogo from '@/app/assets/HackMate.svg'
import { LuExternalLink } from "react-icons/lu";
import { FaRegStar, FaStar } from "react-icons/fa";
import Image from 'next/image'
import { motion } from 'framer-motion';
import { useFavorites } from '@/app/hooks/use-favorites';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PostsProps {
    id: string,
    title: string,
    url: string,
    logo: string,
    platform: string,
    mode?: string,
    location?: string,
    status?: string,
  description?: string,
  regDate?: string,
  memberCount?: string,
  applicationsCount?: number,
    onFavoriteChange?: () => void,
}

const Posts:React.FC<PostsProps> = ({id, title, url, logo, platform, mode, location, status, description, regDate, memberCount, applicationsCount, onFavoriteChange}) => {
    const { toggleExternalFavorite, isExternalFavorited } = useFavorites();
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();

  const handleFavoriteClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if user is authenticated
        if (sessionStatus === "loading") return; // Wait for session to load
        if (!session) {
            router.push("/login");
            return;
        }
        
        const hackathon = {
            id,
            title,
            url,
            logo,
            platform,
            mode,
            location,
            status,
        };
        
        await toggleExternalFavorite(hackathon);
        
        // Call the refresh callback if provided (for favorites page)
        if (onFavoriteChange) {
            onFavoriteChange();
        }
    };
  const [showApplyModal, setShowApplyModal] = useState(false);
    const [linkedinInput, setLinkedinInput] = useState('');
    const [githubInput, setGithubInput] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);
    // Additional candidate fields (from screenshot)
    const [mobile, setMobile] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [gender, setGender] = useState<'female'|'male'|'non-binary'|'other'|'prefer-not-to-say'|'transgender'|'intersex'|'unknown'>('unknown');
    const [instituteName, setInstituteName] = useState('');
    const [candidateType, setCandidateType] = useState<'college'|'professional'|'school'|'fresher'>('college');
    const [domain, setDomain] = useState('Engineering');
    const [course, setCourse] = useState('B.Tech/BE');
    const [courseSpecialization, setCourseSpecialization] = useState('');
    const [graduatingYear, setGraduatingYear] = useState('2026');
    const [courseDuration, setCourseDuration] = useState('4 Year');
    const [locationInput, setLocationInput] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false);

    const openApply = (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (sessionStatus === 'loading') return;
      if (!session) {
        router.push('/login');
        return;
      }
      setShowApplyModal(true);
    };

    const [applyError, setApplyError] = useState<string | null>(null);

    // prevent background scrolling when modal is open
    useEffect(() => {
      if (showApplyModal) {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
      }
      return;
    }, [showApplyModal]);

    const submitApplication = async (e?: React.FormEvent) => {
      e?.preventDefault();
      setApplying(true);
      setApplyError(null);
      try {
        const form = new FormData();
        form.append('candidateId', session!.user!.id as string);
        form.append('postId', id);
        if (linkedinInput) form.append('linkedinUrl', linkedinInput);
        if (githubInput) form.append('githubUrl', githubInput);
        if (resumeFile) form.append('resume', resumeFile);
        // Append additional candidate fields
        if (mobile) form.append('mobile', mobile);
        if (firstName) form.append('firstName', firstName);
        if (lastName) form.append('lastName', lastName);
        if (gender) form.append('gender', gender);
        if (instituteName) form.append('instituteName', instituteName);
        if (candidateType) form.append('candidateType', candidateType);
        if (domain) form.append('domain', domain);
        if (course) form.append('course', course);
        if (courseSpecialization) form.append('courseSpecialization', courseSpecialization);
        if (graduatingYear) form.append('graduatingYear', graduatingYear);
        if (courseDuration) form.append('courseDuration', courseDuration);
        if (locationInput) form.append('location', locationInput);
        form.append('agreeTerms', agreeTerms ? '1' : '0');

        const res = await fetch('/api/apply', { method: 'POST', body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data?.error || data?.message || `Failed to apply (status ${res.status})`;
          setApplyError(msg);
          throw new Error(msg);
        }
        setApplied(true);
        setShowApplyModal(false);
        // optionally notify parent
      } catch (err: any) {
        console.error('Apply error', err);
        // show inline error
        setApplyError(err?.message || 'Failed to apply');
      } finally {
        setApplying(false);
      }
    };
    const URL = (platform==='unstop' && `https://unstop.com/${url}`) 
      || (platform==='devpost' && `${url}`) 
      || (platform==='devfolio' && `https://${url}`)
      || (platform==='organizer' && `${url}`) 
      || '';

    // Normalise logo value safely
    let Logo: string | null = null;
    if (logo) {
      try {
        // some external logos from unstop/devpost may not include protocol
        if ((platform === 'unstop' || platform === 'devpost') && typeof logo === 'string') {
          Logo = logo.startsWith('http') ? logo : 'https:' + logo;
        } else {
          Logo = logo;
        }
      } catch {
        Logo = null;
      }
    } else {
      Logo = null;
    }

  return (
    <motion.div 
      className='group min-w-[20vw] min-h-[20vh] px-5 py-4 flex flex-col justify-between items-start flex-wrap rounded-lg border border-gray-500 dark:border-gray-800 dark:backdrop-blur-xl transition-all ease-in-out duration-500 hover:border-accent hover:shadow-xl hover:scale-110 hover:bg-gray-200 dark:hover:bg-gray-700 relative'
      whileHover={{ scale: 1.1, boxShadow: "0px 6px 15px rgba(0, 0, 0, 0.3)" }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Star button positioned at top right */}
      <button
        onClick={handleFavoriteClick}
        className={`absolute top-3 right-3 p-1 transition-transform z-10 ${
          session ? 'hover:scale-110' : 'hover:scale-105 opacity-70'
        }`}
        title={!session ? "Login to favorite hackathons" : ""}
      >
        {session && isExternalFavorited(id, platform) ? (
          <FaStar className="w-5 h-5 text-yellow-500" />
        ) : (
          <FaRegStar className={`w-5 h-5 ${!session ? 'text-gray-400' : ''}`} />
        )}
      </button>

      {/* Main content that links to hackathon */}
      <motion.a 
        href={URL} 
        target='_blank' 
        className='w-full h-full flex flex-col justify-between'
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className='flex items-start space-x-3'>
          <div className='relative w-10 h-10'>
            {(() => {
              const imageSrc = Logo !== null ? Logo :
                platform === 'unstop' ? unstop :
                platform === 'devpost' ? devpost :
                platform === 'devfolio' ? devfolio :
                platform === 'organizer' ? HackLogo :
                '';

              return (
                <Image src={imageSrc as any} alt={platform} fill style={{ objectFit: 'contain' }} className='rounded-full' />
              );
            })()}
          </div>
          <div className='flex flex-col'>
            <h3 className='text-lg font-semibold pr-8'>{title}</h3>
            {description && (
              <p className='text-sm text-gray-600 dark:text-gray-400 max-w-xs line-clamp-2 mt-1'>
                {description}
              </p>
            )}
          </div>
        </div>
      <motion.div 
        className='flex flex-wrap gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        {mode && (
          <span className='px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'>
            {mode}
          </span>
        )}
        {memberCount && (
          <span className='px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'>
            {memberCount} members
          </span>
        )}
        {regDate && (
          <span className='px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'>
            {new Date(regDate).toLocaleDateString()}
          </span>
        )}
        {applicationsCount !== undefined && (
          <span className='px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'>
            {applicationsCount} applications
          </span>
        )}
        {status && (
          <span className={`px-2 py-1 rounded-full ${
            status.toLowerCase() === 'live' || status.toLowerCase() === 'open' 
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}>
            {status}
          </span>
        )}
        {location && mode !== 'Online' && (
          <span className='flex items-center gap-1 w-full mt-1'>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {location}
          </span>
        )}
      </motion.div>
        <motion.div
          className='opacity-0 group-hover:opacity-100 transition-opacity duration-300'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <LuExternalLink size={20} />
        </motion.div>
      </motion.a>

      {/* Apply button for organizer posts (positioned absolutely so each card shows its own button) */}
      {platform === 'organizer' && (
        <div className='absolute bottom-3 right-3 z-20'>
          <button
            onClick={(e) => { e.stopPropagation(); openApply(e); }}
            className={`px-3 py-1 rounded bg-primary text-white ${applied ? 'opacity-60 cursor-default' : 'hover:brightness-110'}`}
            disabled={applied}
            title={applied ? 'Already applied' : 'Apply'}
          >
            {applied ? 'Applied' : 'Apply'}
          </button>
        </div>
      )}

      {/* Apply modal */}
      {showApplyModal && (
        // render modal as a portal to body to ensure it sits above all other content
        typeof document !== 'undefined' ? (
          // lazy-create a modal-root if not present
          (() => {
            let root = document.getElementById('modal-root');
            if (!root) {
              root = document.createElement('div');
              root.id = 'modal-root';
              document.body.appendChild(root);
            }
            return (
              createPortal(
                <div className='fixed inset-0 z-[99999] flex items-center justify-center bg-black/60' onClick={() => setShowApplyModal(false)}>
                  <div className='bg-white dark:bg-gray-900 p-6 rounded shadow max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto' onClick={(e) => e.stopPropagation()} role='dialog' aria-modal='true'>
                    <h3 className='text-lg font-semibold mb-2'>Apply for {title}</h3>
                    {applyError && <div className='text-sm text-red-600 mb-2'>{applyError}</div>}
                    <form onSubmit={submitApplication} className='space-y-3 max-h-[70vh] overflow-auto pr-2'>
                      {/* Candidate details fields (from screenshot) */}
                      <div>
                        <label className='text-sm block mb-1'>Email</label>
                        <input className='w-full input' value={session?.user?.email || ''} disabled />
                      </div>
                      <div>
                        <label className='text-sm block mb-1'>Mobile</label>
                        <input value={mobile} onChange={(e)=>setMobile(e.target.value)} className='w-full input' placeholder='+91 - 1234567890' />
                      </div>
                      <div className='flex gap-2'>
                        <div className='w-1/2'>
                          <label className='text-sm block mb-1'>First Name</label>
                          <input value={firstName} onChange={(e)=>setFirstName(e.target.value)} className='w-full input' />
                        </div>
                        <div className='w-1/2'>
                          <label className='text-sm block mb-1'>Last Name (if applicable)</label>
                          <input value={lastName} onChange={(e)=>setLastName(e.target.value)} className='w-full input' />
                        </div>
                      </div>
                      <div>
                        <label className='text-sm block mb-1'>Gender</label>
                        <div className='flex flex-wrap gap-2'>
                          {['female','male','transgender','non-binary','intersex','prefer-not-to-say','other'].map(g => (
                            <button type='button' key={g} onClick={() => setGender(g as any)} className={`px-3 py-1 rounded border ${gender===g? 'bg-primary text-white' : ''}`}>
                              {g.charAt(0).toUpperCase()+g.slice(1).replace('-', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className='text-sm block mb-1'>Institute Name</label>
                        <input value={instituteName} onChange={(e)=>setInstituteName(e.target.value)} className='w-full input' />
                      </div>
                      <div>
                        <label className='text-sm block mb-1'>Type</label>
                        <div className='flex gap-2'>
                          <button type='button' onClick={()=>setCandidateType('college')} className={`px-3 py-1 rounded border ${candidateType==='college' ? 'bg-primary text-white' : ''}`}>College Students</button>
                          <button type='button' onClick={()=>setCandidateType('professional')} className={`px-3 py-1 rounded border ${candidateType==='professional' ? 'bg-primary text-white' : ''}`}>Professional</button>
                          <button type='button' onClick={()=>setCandidateType('school')} className={`px-3 py-1 rounded border ${candidateType==='school' ? 'bg-primary text-white' : ''}`}>School Student</button>
                          <button type='button' onClick={()=>setCandidateType('fresher')} className={`px-3 py-1 rounded border ${candidateType==='fresher' ? 'bg-primary text-white' : ''}`}>Fresher</button>
                        </div>
                      </div>
                      <div className='flex gap-2'>
                        <div className='w-1/2'>
                          <label className='text-sm block mb-1'>Domain</label>
                          <select value={domain} onChange={(e)=>setDomain(e.target.value)} className='w-full input'>
                            <option>Management</option>
                            <option>Engineering</option>
                            <option>Arts & Science</option>
                            <option>Medicine</option>
                            <option>Law</option>
                          </select>
                        </div>
                        <div className='w-1/2'>
                          <label className='text-sm block mb-1'>Course</label>
                          <select value={course} onChange={(e)=>setCourse(e.target.value)} className='w-full input'>
                            <option>B.Tech/BE</option>
                            <option>BA</option>
                            <option>BSc</option>
                            <option>MBBS</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className='text-sm block mb-1'>Course Specialization</label>
                        <input value={courseSpecialization} onChange={(e)=>setCourseSpecialization(e.target.value)} className='w-full input' />
                      </div>
                      <div className='flex gap-2 items-center'>
                        <div>
                          <label className='text-sm block mb-1'>Graduating Year</label>
                          <select value={graduatingYear} onChange={(e)=>setGraduatingYear(e.target.value)} className='input'>
                            <option>2026</option>
                            <option>2027</option>
                            <option>2028</option>
                            <option>2029</option>
                          </select>
                        </div>
                        <div className='ml-4'>
                          <label className='text-sm block mb-1'>Course Duration</label>
                          <select value={courseDuration} onChange={(e)=>setCourseDuration(e.target.value)} className='input'>
                            <option>4 Year</option>
                            <option>3 Year</option>
                            <option>2 Year</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className='text-sm block mb-1'>Location</label>
                        <input value={locationInput} onChange={(e)=>setLocationInput(e.target.value)} className='w-full input' placeholder='City, State, Country' />
                      </div>
                      <div className='flex items-center gap-2'>
                        <input id='agree' type='checkbox' checked={agreeTerms} onChange={(e)=>setAgreeTerms(e.target.checked)} />
                        <label htmlFor='agree' className='text-sm'>I agree to share my data and accept the terms.</label>
                      </div>
                      <div>
                        <label className='text-sm block mb-1'>LinkedIn (optional)</label>
                        <input value={linkedinInput} onChange={(e)=>setLinkedinInput(e.target.value)} className='w-full input' placeholder='https://linkedin.com/in/...' />
                      </div>
                      <div>
                        <label className='text-sm block mb-1'>GitHub (optional)</label>
                        <input value={githubInput} onChange={(e)=>setGithubInput(e.target.value)} className='w-full input' placeholder='https://github.com/...' />
                      </div>
                      <div>
                        <label className='text-sm block mb-1'>Resume (optional)</label>
                        <input type='file' onChange={(e)=> setResumeFile(e.target.files ? e.target.files[0] : null)} className='w-full' />
                      </div>
                      <div className='flex justify-end space-x-2'>
                        <button type='button' onClick={() => setShowApplyModal(false)} className='px-3 py-1 rounded border'>Cancel</button>
                        <button type='submit' disabled={applying} className='px-3 py-1 rounded bg-primary text-white'>
                          {applying ? 'Applying...' : 'Submit Application'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>,
                root
              )
            );
          })()
        ) : null
      )}
    </motion.div>
  )
}

export default Posts;
