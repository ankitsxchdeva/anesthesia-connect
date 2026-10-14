'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { setToken, signup } from '@/lib/api'
import type { Role } from '@/lib/types'
import { Button, Card, ErrorBanner, Input, PageHeader, Select } from '@/components/ui'

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('prospective')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { token } = await signup({
        email: email.trim().toLowerCase(),
        password,
        display_name: displayName.trim(),
        role,
      })
      setToken(token)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm pt-12">
      <PageHeader title="Create your account" subtitle="For prospective SRNAs, current SRNAs, and CRNAs." />
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Display name</label>
            <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">I am a…</label>
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full">
              <option value="prospective">Prospective SRNA (ICU nurse exploring)</option>
              <option value="srna">Current SRNA</option>
              <option value="crna">Practicing CRNA</option>
            </Select>
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-slate-500">
        Have an account?{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
