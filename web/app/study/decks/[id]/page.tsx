'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AuthGate } from '@/lib/auth'
import { ApiError, getDeck } from '@/lib/api'
import type { Card, Deck } from '@/lib/types'
import { Badge, Button, EmptyState, ErrorBanner, PageHeader, Spinner } from '@/components/ui'

export default function DeckRunnerPage() {
  const params = useParams<{ id: string }>()
  const id = typeof params?.id === 'string' ? params.id : ''

  const [deck, setDeck] = useState<{ deck: Deck; cards: Card[] } | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getDeck(id)
      .then((d) => {
        if (cancelled) return
        setDeck(d)
        setLoaded(true)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof ApiError ? e : new ApiError(0, 'Something went wrong loading this deck.'))
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const cards = deck?.cards ?? []

  const next = () => {
    setFlipped(false)
    setIndex((i) => Math.min(i + 1, cards.length - 1))
  }
  const prev = () => {
    setFlipped(false)
    setIndex((i) => Math.max(i - 1, 0))
  }

  useEffect(() => {
    if (cards.length === 0) return
    function onKey(e: KeyboardEvent) {
      const target = e.target
      if (target instanceof HTMLElement && (target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowRight') {
        next()
      } else if (e.key === 'ArrowLeft') {
        prev()
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length])

  const card = cards[index]

  return (
    <AuthGate>
      <div className="mb-6">
        <Link href="/study" className="text-sm font-medium text-brand hover:underline">
          ← Back to Study
        </Link>
      </div>
      {!loaded ? (
        <Spinner />
      ) : error ? (
        error.status === 404 ? (
          <EmptyState title="Not found" hint="This deck does not exist." />
        ) : (
          <ErrorBanner message={error.message} />
        )
      ) : !deck || cards.length === 0 || !card ? (
        <EmptyState title="This deck has no cards yet" hint="Add cards to start studying." />
      ) : (
        <>
          <PageHeader
            title={deck.deck.title}
            subtitle={deck.deck.description ?? undefined}
            action={<Badge>{deck.deck.card_count ?? cards.length} cards</Badge>}
          />

          <div
            onClick={() => setFlipped((f) => !f)}
            className="mx-auto flex min-h-72 w-full max-w-3xl cursor-pointer select-none flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-14 text-center shadow-sm transition-colors hover:border-brand"
          >
            <span className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-400">
              {flipped ? 'Back' : 'Front'}
            </span>
            {flipped ? (
              <p className="text-xl font-medium text-slate-900">{card.back}</p>
            ) : (
              <p className="text-xl font-medium text-slate-900">{card.front}</p>
            )}
            <span className="mt-6 text-xs text-slate-400">Click or press Space to flip</span>
          </div>

          <div className="mx-auto mt-6 flex max-w-3xl items-center justify-between">
            <Button variant="secondary" onClick={prev} disabled={index === 0}>
              ← Prev
            </Button>
            <span className="text-sm font-medium text-slate-500">
              {index + 1} / {cards.length}
            </span>
            <Button variant="secondary" onClick={next} disabled={index === cards.length - 1}>
              Next →
            </Button>
          </div>
        </>
      )}
    </AuthGate>
  )
}
