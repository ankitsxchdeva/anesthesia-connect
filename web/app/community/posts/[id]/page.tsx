'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { createComment, getPost, markHelpful } from '@/lib/api'
import { AuthGate } from '@/lib/auth'
import type { Comment, Post } from '@/lib/types'
import { timeAgo } from '@/lib/format'
import { Badge, Button, Card, EmptyState, ErrorBanner, Spinner, Textarea } from '@/components/ui'

const CATEGORY_LABELS: Record<string, string> = {
  admissions: 'Admissions & Applications',
  study: 'SRNA Study & Clinical',
  practice: 'CRNA Practice & Experiences',
  networking: 'Networking & Community',
}

const CATEGORY_COLORS: Record<string, 'blue' | 'violet' | 'green' | 'amber'> = {
  admissions: 'blue',
  study: 'violet',
  practice: 'green',
  networking: 'amber',
}

interface CommentNode {
  comment: Comment
  children: CommentNode[]
}

function buildTree(flat: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>()
  flat.forEach((c) => map.set(c.id, { comment: c, children: [] }))
  const roots: CommentNode[] = []
  flat.forEach((c) => {
    const node = map.get(c.id)!
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export default function PostDetailPage() {
  const params = useParams<{ id: string }>()
  const postId = params.id

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [posting, setPosting] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getPost(postId)
      setPost(data.post)
      setComments(data.comments)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post')
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    if (postId) load()
  }, [postId, load])

  async function onHelpful(comment: Comment) {
    setActionError(null)
    try {
      const { helpful_count } = await markHelpful(comment.id)
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, helpful_count, voted: true } : c)),
      )
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark helpful')
    }
  }

  async function submitComment(body: string, parent_id?: string) {
    setActionError(null)
    setPosting(true)
    try {
      await createComment(postId, parent_id ? { body, parent_id } : { body })
      setReplyTo(null)
      setReplyBody('')
      setCommentBody('')
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setPosting(false)
    }
  }

  function renderNode(node: CommentNode, depth: number) {
    const c = node.comment
    return (
      <div key={c.id} className={depth > 0 ? 'ml-4 border-l-2 border-slate-200 pl-4' : undefined}>
        <div className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-sm font-semibold text-slate-900">{c.author}</span>
              <span className="ml-2 text-xs text-slate-400">{timeAgo(c.created_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                disabled={!!c.voted}
                onClick={() => onHelpful(c)}
                className="px-2 py-1 text-xs"
              >
                Helpful ({c.helpful_count})
              </Button>
              <button
                onClick={() => {
                  setReplyTo(replyTo === c.id ? null : c.id)
                  setReplyBody('')
                }}
                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                Reply
              </button>
            </div>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
          {replyTo === c.id && (
            <div className="mt-2 space-y-2">
              <Textarea
                rows={2}
                autoFocus
                placeholder={`Reply to ${c.author}…`}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button
                  disabled={!replyBody.trim() || posting}
                  onClick={() => submitComment(replyBody.trim(), c.id)}
                >
                  Reply
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setReplyTo(null)
                    setReplyBody('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <AuthGate>
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="space-y-4">
          <ErrorBanner message={error} />
          <Link href="/community" className="text-sm font-medium text-brand hover:underline">
            ← Back to board
          </Link>
        </div>
      ) : post ? (
        <div className="space-y-6">
          <div>
            <Link href="/community" className="text-sm font-medium text-brand hover:underline">
              ← Back to board
            </Link>
            <div className="mt-3">
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={CATEGORY_COLORS[post.category] ?? 'slate'}>
                    {CATEGORY_LABELS[post.category] ?? post.category}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {post.author} · {timeAgo(post.created_at)}
                  </span>
                </div>
                <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
                  {post.title}
                </h1>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{post.body}</p>
              </Card>
            </div>
          </div>

          {actionError && <ErrorBanner message={actionError} />}

          <div>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              Comments ({comments.length})
            </h2>
            {comments.length === 0 ? (
              <EmptyState title="No comments yet" hint="Start the conversation below." />
            ) : (
              <div className="divide-y divide-slate-100">
                {buildTree(comments).map((node) => renderNode(node, 0))}
              </div>
            )}
          </div>

          <Card>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Add a comment</h3>
            <Textarea
              rows={3}
              placeholder="Write a comment…"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <div className="mt-3">
              <Button disabled={!commentBody.trim() || posting} onClick={() => submitComment(commentBody.trim())}>
                {posting ? 'Posting…' : 'Comment'}
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState title="Post not found" />
      )}
    </AuthGate>
  )
}
