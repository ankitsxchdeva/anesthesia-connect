'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { AuthGate } from '@/lib/auth'
import { ApiError, getQuiz, submitQuizAttempt } from '@/lib/api'
import type { QuizDetail } from '@/lib/types'
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, Spinner } from '@/components/ui'

export default function QuizRunnerPage() {
  const params = useParams<{ id: string }>()
  const id = typeof params?.id === 'string' ? params.id : ''

  const [quiz, setQuiz] = useState<QuizDetail | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loaded, setLoaded] = useState(false)

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getQuiz(id)
      .then((q) => {
        if (cancelled) return
        setQuiz(q)
        setAnswers(new Array(q.questions.length).fill(null))
        setLoaded(true)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof ApiError ? e : new ApiError(0, 'Something went wrong loading this quiz.'))
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const questions = quiz?.questions ?? []
  const done = loaded && !error && questions.length > 0 && index >= questions.length
  const score = answers.reduce<number>(
    (acc, picked, i) => acc + (picked !== null && questions[i] && picked === questions[i].correct_index ? 1 : 0),
    0,
  )

  // Fire the attempt once on entering the score screen (ref guards StrictMode double-run).
  useEffect(() => {
    if (!done || !quiz || submittedRef.current) return
    submittedRef.current = true
    submitQuizAttempt(quiz.id, { score, total: questions.length }).catch(() => {
      setSubmitError('Could not save your attempt — your score is still shown below.')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  const pick = (optionIndex: number) => {
    setAnswers((a) => (a[index] === null ? a.map((v, i) => (i === index ? optionIndex : v)) : a))
  }

  const retake = () => {
    submittedRef.current = false
    setSubmitError(null)
    setAnswers(new Array(questions.length).fill(null))
    setIndex(0)
  }

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
          <EmptyState title="Not found" hint="This quiz does not exist." />
        ) : (
          <ErrorBanner message={error.message} />
        )
      ) : !quiz || questions.length === 0 ? (
        <EmptyState title="This quiz has no questions yet" hint="Questions will appear here once added." />
      ) : done ? (
        <Card className="mx-auto max-w-xl py-10 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Quiz complete</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">You scored {score} / {questions.length}</p>
          {submitError && (
            <div className="mt-4 text-left">
              <ErrorBanner message={submitError} />
            </div>
          )}
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button onClick={retake}>Retake quiz</Button>
            <Link
              href="/study"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back to Study
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <PageHeader
            title={quiz.title}
            subtitle={quiz.description ?? undefined}
            action={<Badge color="blue">Question {index + 1} of {questions.length}</Badge>}
          />

          {(() => {
            const q = questions[index]
            const picked = answers[index]
            const revealed = picked !== null
            return (
              <Card className="mx-auto max-w-3xl">
                <p className="text-lg font-medium text-slate-900">{q.prompt}</p>
                <div className="mt-4 flex flex-col gap-2">
                  {q.options.map((option, oi) => {
                    const isCorrect = oi === q.correct_index
                    const isPicked = oi === picked
                    let state = ''
                    if (revealed && isCorrect) state = 'border-green-500 bg-green-50 text-green-900'
                    else if (revealed && isPicked) state = 'border-red-500 bg-red-50 text-red-900'
                    return (
                      <Button
                        key={oi}
                        variant="secondary"
                        className={state ? `justify-start ${state} pointer-events-none` : 'justify-start'}
                        onClick={() => pick(oi)}
                      >
                        {option}
                      </Button>
                    )
                  })}
                </div>
                {revealed && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-700">
                      {picked === questions[index].correct_index ? 'Correct!' : 'Not quite.'}
                    </p>
                    {q.explanation && <p className="mt-1 text-sm text-slate-600">{q.explanation}</p>}
                  </div>
                )}
                <div className="mt-5 flex justify-end">
                  <Button disabled={!revealed} onClick={() => setIndex((i) => i + 1)}>
                    Next question
                  </Button>
                </div>
              </Card>
            )
          })()}
        </>
      )}
    </AuthGate>
  )
}
