'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createPost } from '@/lib/api'
import { AuthGate } from '@/lib/auth'
import { POST_CATEGORIES } from '@/lib/types'
import { Button, Card, ErrorBanner, Input, PageHeader, Select, Textarea, cn } from '@/components/ui'

const CATEGORY_LABELS: Record<string, string> = {
  admissions: 'Admissions & Applications',
  study: 'SRNA Study & Clinical',
  practice: 'CRNA Practice & Experiences',
  networking: 'Networking & Community',
}

export default function NewPostPage() {
  const router = useRouter()
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!category) {
      setError('Choose a category for your post.')
      return
    }
    setBusy(true)
    try {
      const post = await createPost({
        category,
        title: title.trim(),
        body: body.trim(),
        is_anonymous: anonymous,
      })
      router.push(`/community/posts/${post.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
      setBusy(false)
    }
  }

  return (
    <AuthGate>
      <div className="mx-auto max-w-2xl">
        <PageHeader title="New post" subtitle="Start a discussion with the community." />
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <ErrorBanner message={error} />}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
              <Select required value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="" disabled>
                  Choose a category…
                </option>
                {POST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
              <Input
                required
                maxLength={200}
                placeholder="What do you want to discuss?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Body</label>
              <Textarea
                required
                rows={8}
                placeholder="Share details, context, and questions…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
              Post anonymously — your name will be hidden
            </label>
            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={busy}>
                {busy ? 'Posting…' : 'Post'}
              </Button>
              <Link
                href="/community"
                className={cn('text-sm font-medium text-slate-500 hover:text-slate-800')}
              >
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </AuthGate>
  )
}
