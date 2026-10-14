'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AuthGate } from '@/lib/auth'
import { ApiError, listDecks, listMyAttempts, listQuizzes, saveDeck, unsaveDeck } from '@/lib/api'
import type { Deck, Quiz, QuizAttempt } from '@/lib/types'
import { timeAgo } from '@/lib/format'
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, Spinner } from '@/components/ui'

export default function StudyPage() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busyDeckId, setBusyDeckId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listDecks(), listQuizzes(), listMyAttempts()])
      .then(([d, q, a]) => {
        if (cancelled) return
        setDecks(d)
        setQuizzes(q)
        setAttempts(a)
        setLoaded(true)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof ApiError ? e : new ApiError(0, 'Something went wrong loading study content.'))
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toggleSave = async (deck: Deck) => {
    const nextSaved = !deck.saved
    setDecks((ds) => ds.map((d) => (d.id === deck.id ? { ...d, saved: nextSaved } : d)))
    setSaveError(null)
    setBusyDeckId(deck.id)
    try {
      if (nextSaved) await saveDeck(deck.id)
      else await unsaveDeck(deck.id)
    } catch {
      setDecks((ds) => ds.map((d) => (d.id === deck.id ? { ...d, saved: !nextSaved } : d)))
      setSaveError('Could not update saved status — please try again.')
    } finally {
      setBusyDeckId(null)
    }
  }

  const latestAttempt = (quizId: string): QuizAttempt | undefined =>
    attempts.find((a) => a.quiz_id === quizId)

  return (
    <AuthGate>
      <PageHeader title="Study" subtitle="Flashcard decks and practice quizzes to test your knowledge." />
      {saveError && (
        <div className="mb-4">
          <ErrorBanner message={saveError} />
        </div>
      )}
      {!loaded ? (
        <Spinner />
      ) : error ? (
        error.status === 404 ? (
          <EmptyState title="Not found" hint="Study content could not be loaded." />
        ) : (
          <ErrorBanner message={error.message} />
        )
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Flashcard decks</h2>
            {decks.length === 0 ? (
              <EmptyState title="No decks yet" hint="Decks will appear here once added." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {decks.map((deck) => (
                  <Card key={deck.id} className="flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">{deck.title}</h3>
                      {typeof deck.card_count === 'number' && <Badge>{deck.card_count} cards</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">by {deck.author}</p>
                    {deck.description && <p className="mt-2 text-sm text-slate-600">{deck.description}</p>}
                    <div className="mt-4 flex items-center gap-2 pt-1">
                      <Button
                        variant={deck.saved ? 'secondary' : 'ghost'}
                        disabled={busyDeckId === deck.id}
                        onClick={() => toggleSave(deck)}
                      >
                        {deck.saved ? 'Saved' : 'Save'}
                      </Button>
                      <Link
                        href={`/study/decks/${deck.id}`}
                        className="inline-flex items-center justify-center rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
                      >
                        Study deck
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Quizzes</h2>
            {quizzes.length === 0 ? (
              <EmptyState title="No quizzes yet" hint="Quizzes will appear here once added." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {quizzes.map((quiz) => {
                  const attempt = latestAttempt(quiz.id)
                  return (
                    <Card key={quiz.id} className="flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-slate-900">{quiz.title}</h3>
                        {typeof quiz.question_count === 'number' && (
                          <Badge color="blue">{quiz.question_count} questions</Badge>
                        )}
                      </div>
                      {quiz.description && <p className="mt-2 text-sm text-slate-600">{quiz.description}</p>}
                      {attempt && (
                        <p className="mt-2 text-sm text-slate-500">
                          Last attempt: <span className="font-medium text-slate-700">{attempt.score} / {attempt.total}</span>{' '}
                          · {timeAgo(attempt.created_at)}
                        </p>
                      )}
                      <div className="mt-4 pt-1">
                        <Link
                          href={`/study/quizzes/${quiz.id}`}
                          className="inline-flex items-center justify-center rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
                        >
                          Take quiz
                        </Link>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </AuthGate>
  )
}
