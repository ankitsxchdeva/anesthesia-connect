'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ApiError, listCalculators } from '@/lib/api'
import { AuthGate } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import type { Calculator } from '@/lib/types'
import { Badge, Card, EmptyState, ErrorBanner, PageHeader, Spinner } from '@/components/ui'

const DISCLAIMER =
  'Educational tool only — not clinical decision support. Verify against institutional protocols and primary sources before any clinical use.'

export default function CalculatorsPage() {
  return (
    <AuthGate>
      <CalculatorsList />
    </AuthGate>
  )
}

function CalculatorsList() {
  const [calculators, setCalculators] = useState<Calculator[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listCalculators()
      .then((rows) => {
        if (!cancelled) setCalculators(rows)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Something went wrong')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <ErrorBanner message={error} />
  if (!calculators) return <Spinner />

  return (
    <div>
      <PageHeader
        title="Calculators"
        subtitle="Educational calculators for anesthesia study and practice."
      />

      {calculators.length === 0 ? (
        <EmptyState title="No calculators available yet." />
      ) : (
        <div className="space-y-4">
          {calculators.map((c) => (
            <Card key={c.id}>
              <Link
                href={`/calculators/${c.slug}`}
                className="text-base font-semibold text-brand hover:underline"
              >
                {c.name}
              </Link>
              {c.description && <p className="mt-1 text-sm text-slate-600">{c.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <Badge color="teal">{c.version}</Badge>
                {(c.review_date || c.reviewed_by) && (
                  <span>
                    Reviewed {formatDate(c.review_date)}
                    {c.reviewed_by ? ` by ${c.reviewed_by}` : ''}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500">{DISCLAIMER}</p>
    </div>
  )
}
