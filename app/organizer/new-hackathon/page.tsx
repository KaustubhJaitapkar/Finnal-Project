"use client"
import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function NewHackathon() {
  const router = useRouter()
  const [step, setStep] = useState<1|2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // store selected file to upload
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const [form, setForm] = useState({
    logoFileName: '',
    title: '',
    organisation: '',
    opportunityType: 'Hackathons & Coding Challenges',
    opportunitySubType: 'Online Coding Challenge',
    category: [] as string[],
    festival: '',
    website: '',
    location: '',
    description: '',
    skills: [] as string[],
    eligibility: {
      gender: 'any', // 'any' | 'female' | 'male' | 'other'
      userType: 'any', // 'any' | 'college' | 'professional'
    } as { gender: string; userType: string },
  })

  const logoInputRef = useRef<HTMLInputElement | null>(null)

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  function handleLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0]
    if (f) {
      setField('logoFileName', f.name)
      setLogoFile(f)
    }
  }

  // simple tags input: enter or comma
  function handleSkillsKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const v = (e.target as HTMLInputElement).value.trim()
    if (!v) return
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (!form.skills.includes(v)) setField('skills', [...form.skills, v]);
      (e.target as HTMLInputElement).value = ''
    }
  }

  function removeSkill(i: number) {
    setField('skills', form.skills.filter((_, idx) => idx !== i))
  }

  function toggleCategory(cat: string) {
    if (form.category.includes(cat)) setField('category', form.category.filter(c => c !== cat))
    else setField('category', [...form.category, cat])
  }

  async function saveDraft() {
    // lightweight client-side save; implement server persist if desired
    try {
      setLoading(true)
      // no-op for now; could call /api/hackathons to persist
      setTimeout(()=> setLoading(false), 600)
    } catch (err) {
      setError('Failed to save draft')
      setLoading(false)
    }
  }

  async function publish() {
    setLoading(true)
    setError(null)
    try {
      let logoUrl: string | undefined = undefined
      if (logoFile) {
        const formData = new FormData()
        formData.append('logo', logoFile)
        const uploadRes = await fetch('/api/uploads/logo', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json().catch(() => ({}))
        if (!uploadRes.ok) throw new Error(uploadData?.error || 'Logo upload failed')
        logoUrl = uploadData?.url
      }

      const payload = { ...form, logo: logoUrl }
      const res = await fetch('/api/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(()=> ({}))
      if (!res.ok) throw new Error(data?.error || 'Publish failed')
      router.push('/organizer')
    } catch (err: any) {
      setError(err?.message || 'Publish failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Post an Opportunity</h2>
      <div className="flex gap-6">
        {/* Left column: stepper + support */}
        <aside className="w-72">
          <div className="p-4 border rounded-lg mb-6 shadow-sm bg-black">
            <div className="text-sm font-medium mb-3">Post an Opportunity</div>
            <div className="space-y-4">
              <div className={`flex items-center gap-3 ${step===1 ? 'text-primary' : 'text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step===1 ? 'bg-primary text-white' : ''}`}>1</div>
                <div>
                  <div className="text-sm font-semibold">Step 1</div>
                  <div className="text-xs text-gray-500">Opportunity details</div>
                </div>
              </div>
              <div className={`flex items-center gap-3 ${step===2 ? 'text-primary' : 'text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step===2 ? 'bg-primary text-white' : ''}`}>2</div>
                <div>
                  <div className="text-sm font-semibold">Step 2</div>
                  <div className="text-xs text-gray-500">Registration Form</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg shadow-sm bg-black">
            <div className="text-sm font-medium mb-2">Support</div>
            <div className="text-xs text-gray-600">Facing any issues or need any help?</div>
            <div className="text-xs text-gray-500 mt-2">Reach us at support@yourapp.com</div>
          </div>
        </aside>

        {/* Right column: form */}
        <main className="flex-1">
          <div className="bg-white rounded-lg shadow p-6 max-h-[75vh] overflow-auto">
            <div className="bg-white rounded-md p-4 mb-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-md flex items-center justify-center border border-gray-200 p-2 shadow-inner">Logo</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Supported logo image JPG, JPEG, or PNG. Max 1 MB</div>
                  <div className="text-xs text-gray-500 mt-1">Change Logo</div>
                </div>
                <div>
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoPick} className="hidden" />
                  <button type="button" onClick={()=> logoInputRef.current?.click()} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-150 border border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200">Change Logo</button>
                </div>
              </div>
            </div>

            {step === 1 ? (
              <section>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Opportunity Title *</label>
                    <input value={form.title} onChange={(e)=> setField('title', e.target.value)} placeholder="e.g. HackMate Hackathon" className="w-full input bg-white border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-md px-3 py-2" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Organisation Name *</label>
                    <input value={form.organisation} onChange={(e)=> setField('organisation', e.target.value)} placeholder="Organisation name" className="w-full input bg-white border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-md px-3 py-2" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Opportunity Type *</label>
                      <select value={form.opportunityType} onChange={(e)=> setField('opportunityType', e.target.value)} className="w-full input bg-white border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-md px-3 py-2">
                        <option>Hackathons & Coding Challenges</option>
                        <option>Workshops</option>
                        <option>Competitions</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Opportunity Sub-type *</label>
                      <select value={form.opportunitySubType} onChange={(e)=> setField('opportunitySubType', e.target.value)} className="w-full input bg-white border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-md px-3 py-2">
                        <option>Online Coding Challenge</option>
                        <option>In-person Hackathon</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Opportunity Category *</label>
                    <div className="flex flex-wrap gap-2">
                      {['Coding Challenge','AI/ML','Web','Mobile','Design'].map(c => (
                        <button key={c} type="button" onClick={()=> toggleCategory(c)} className={`px-3 py-1 rounded-md ${form.category.includes(c) ? 'bg-blue-600 text-white border border-blue-700 shadow-sm' : 'bg-grey-300 text-gray-700 border border-gray-200 shadow-sm'} focus:outline-none focus:ring-2 focus:ring-blue-200`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Link Festival/Campaign</label>
                    <input value={form.festival} onChange={(e)=> setField('festival', e.target.value)} placeholder="Enter Festival/campaign name" className="w-full input bg-white border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-md px-3 py-2" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Location</label>
                    <input value={form.location} onChange={(e) => setField('location', e.target.value)} placeholder="City, State, Country" className="w-full input bg-white border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-md px-3 py-2" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">About the Opportunity</label>
                    <textarea value={form.description} onChange={(e)=> setField('description', e.target.value)} placeholder="Include Rules, Eligibility, Process, Format, etc." className="w-full h-40 input bg-white border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-md px-3 py-2" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Eligibility Restrictions</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Gender</label>
                        <select value={form.eligibility.gender} onChange={(e)=> setField('eligibility', { ...form.eligibility, gender: e.target.value })} className="w-full input bg-white border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-md px-3 py-2">
                          <option value="any">Any</option>
                          <option value="female">Only females</option>
                          <option value="male">Only males</option>
                          <option value="other">Other / Prefer not to say</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Applicant Type</label>
                        <select value={form.eligibility.userType} onChange={(e)=> setField('eligibility', { ...form.eligibility, userType: e.target.value })} className="w-full input bg-white border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-md px-3 py-2">
                          <option value="any">Any</option>
                          <option value="college">College students only</option>
                          <option value="professional">Working professionals only</option>
                        </select>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">These restrictions will be stored and shown to applicants when they apply.</div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={saveDraft} className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white transition-colors duration-150 border border-green-700">Save as Draft</button>
                  <button type="button" onClick={()=> setStep(2)} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-150 border border-blue-700">Save and next</button>
                </div>
              </section>
            ) : (
              <section>
                <h3 className="text-lg font-semibold mb-3">Registration Form</h3>
                <p className="text-sm text-gray-500 mb-4">Customize the form candidates fill out when applying for this role.</p>

                <div className="space-y-3">
                  {[
                    { key: 'name', label: 'Name', required: true },
                    { key: 'email', label: 'Email', required: true },
                    { key: 'mobile', label: 'Mobile number', required: true },
                    { key: 'resume', label: 'CV/Resume', required: false },
                    { key: 'location', label: "Applicant's location", required: true },
                    { key: 'differently', label: 'Differently abled', required: false },
                    { key: 'gender', label: 'Gender', required: true },
                    { key: 'college', label: 'Current College/Organisation', required: true },
                    { key: 'userType', label: 'User Type', required: true },
                  ].map(f => (
                    <div key={f.key} className="p-3 bg-white rounded-md flex items-center justify-between border border-gray-100 shadow-sm">
                      <div>
                        <div className="font-medium text-gray-800">{f.label}</div>
                        <div className="text-xs text-gray-500">{f.required ? 'Required' : 'Optional'}</div>
                      </div>
                      <div>
                        <label className="inline-flex items-center">
                          <input type="checkbox" defaultChecked={f.required} className="h-4 w-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200" />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={()=> setStep(1)} className="px-4 py-2 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-200">Back</button>
                  <button type="button" onClick={saveDraft} className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white transition-colors duration-150 border border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200">Save as Draft</button>
                  <button type="button" onClick={publish} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-150 border border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200">{loading ? 'Publishing...' : 'Publish'}</button>
                </div>
              </section>
            )}

            {error && <div className="text-red-600 mt-3">{error}</div>}
          </div>
        </main>
      </div>
    </div>
  )
}
