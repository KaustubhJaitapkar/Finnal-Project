"use client"

import React, { useState } from 'react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

export default function CreateTeamDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<any>({
    teamName: '',
    hackathonName: '',
    regURL: '',
    hackathonMode: 'online',
    memberCount: '1',
    regDate: '',
    location: '',
    description: '',
    skills: '',
    role: '',
    experience: '',
  })
  // members: dynamic list of proposed team members (name, skills, github, linkedin)
  const [members, setMembers] = useState<Array<any>>([
    { name: '', skills: '', githubUrl: '', linkedinUrl: '' },
  ])

  const router = useRouter()
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        skills: form.skills,
        members: members.map((m) => ({
          name: m.name,
          skills: m.skills,
          githubUrl: m.githubUrl,
          linkedinUrl: m.linkedinUrl,
        })),
      }

      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 201) {
        toast({ title: 'Team created', description: 'Your team post was created.' })
        setOpen(false)
        router.refresh()
      } else {
        const body = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: body?.error || 'Could not create team' })
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">Create Team</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a team request</DialogTitle>
          <DialogDescription>Post a team request so other members can apply to join.</DialogDescription>
        </DialogHeader>

        <form className="space-y-2 mt-2 text-sm" onSubmit={submit}>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <Label className="text-xs">Team name (optional)</Label>
              <Input
                name="teamName"
                value={form.teamName}
                onChange={handleChange}
                className="h-8 text-xs rounded-md px-2 py-1"
                placeholder="e.g. Team Rocket"
              />
            </div>

            <div>
              <Label className="text-xs">Hackathon / Project name</Label>
              <Input
                name="hackathonName"
                value={form.hackathonName}
                onChange={handleChange}
                className="h-8 text-xs rounded-md px-2 py-1"
                placeholder="Hackathon or project title"
                required
              />
            </div>

            <div>
              <Label className="text-xs">Reference URL</Label>
              <Input
                name="regURL"
                value={form.regURL}
                onChange={handleChange}
                className="h-8 text-xs rounded-md px-2 py-1"
                placeholder="Registration / reference URL"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Mode</Label>
                <select
                  name="hackathonMode"
                  value={form.hackathonMode}
                  onChange={handleChange}
                  className="w-full rounded-md bg-transparent px-2 py-1 text-xs border"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Member count</Label>
                <Input
                  name="memberCount"
                  value={form.memberCount}
                  onChange={handleChange}
                  className="h-8 text-xs rounded-md px-2 py-1"
                  placeholder="e.g. 3"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Start / Reg date</Label>
                <Input
                  name="regDate"
                  value={form.regDate}
                  onChange={handleChange}
                  className="h-8 text-xs rounded-md px-2 py-1"
                  type="date"
                />
              </div>
              <div>
                <Label className="text-xs">Location</Label>
                <Input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className="h-8 text-xs rounded-md px-2 py-1"
                  placeholder="City, Country or Remote"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Skills (comma separated)</Label>
                <Input
                  name="skills"
                  value={form.skills}
                  onChange={handleChange}
                  className="h-8 text-xs rounded-md px-2 py-1"
                  placeholder="e.g. Node.js, React"
                />
              </div>
              <div>
                <Label className="text-xs">Role / Experience</Label>
                <Input
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="h-8 text-xs rounded-md px-2 py-1"
                  placeholder="e.g. Frontend"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="min-h-[56px] text-xs rounded-md px-2 py-1"
                placeholder="Describe your team request / what you're looking for"
              />
            </div>

            <div className="mt-2">
              <h4 className="font-medium mb-1 text-sm">Members</h4>
              <div className="space-y-2">
                {members.map((m, idx) => (
                  <div key={idx} className="p-2 border rounded-md bg-white dark:bg-slate-900">
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <Label className="text-xs">Full name</Label>
                        <Input
                          value={m.name}
                          onChange={(e) => {
                            const next = [...members]
                            next[idx] = { ...next[idx], name: e.target.value }
                            setMembers(next)
                          }}
                          className="h-8 text-xs rounded-md px-2 py-1"
                          placeholder="Full name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Skills</Label>
                        <Input
                          value={m.skills}
                          onChange={(e) => {
                            const next = [...members]
                            next[idx] = { ...next[idx], skills: e.target.value }
                            setMembers(next)
                          }}
                          className="h-8 text-xs rounded-md px-2 py-1"
                          placeholder="Skills (comma separated)"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">GitHub</Label>
                          <Input
                            value={m.githubUrl}
                            onChange={(e) => {
                              const next = [...members]
                              next[idx] = { ...next[idx], githubUrl: e.target.value }
                              setMembers(next)
                            }}
                            className="h-8 text-xs rounded-md px-2 py-1"
                            placeholder="https://github.com/username"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">LinkedIn</Label>
                          <Input
                            value={m.linkedinUrl}
                            onChange={(e) => {
                              const next = [...members]
                              next[idx] = { ...next[idx], linkedinUrl: e.target.value }
                              setMembers(next)
                            }}
                            className="h-8 text-xs rounded-md px-2 py-1"
                            placeholder="https://linkedin.com/in/username"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          type="button"
                          onClick={() => {
                            const next = members.filter((_, i) => i !== idx)
                            setMembers(next.length ? next : [{ name: '', skills: '', githubUrl: '', linkedinUrl: '' }])
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setMembers([...members, { name: '', skills: '', githubUrl: '', linkedinUrl: '' }])}
                  >
                    + Add member
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
