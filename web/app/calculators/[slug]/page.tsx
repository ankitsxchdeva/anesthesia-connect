'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { ApiError, getCalculator } from '@/lib/api'
import { AuthGate } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import type { Calculator } from '@/lib/types'
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  PageHeader,
  Select,
  Spinner,
  Button,
  cn,
} from '@/components/ui'

const DISCLAIMER =
  'Educational tool only — not clinical decision support. Verify against institutional protocols and primary sources before any clinical use.'

type UnitSystem = 'metric' | 'imperial'
type Sex = 'male' | 'female'

const IN_TO_CM = 2.54
const LB_TO_KG = 0.45359237

// Validation ranges per SPEC: height 120–230 cm (47–91 in), weight 30–300 kg (66–660 lb).
const HEIGHT_RANGE = { metric: { min: 120, max: 230, unit: 'cm' }, imperial: { min: 47, max: 91, unit: 'in' } } as const
const WEIGHT_RANGE = { metric: { min: 30, max: 300, unit: 'kg' }, imperial: { min: 66, max: 660, unit: 'lb' } } as const
type FieldKind = 'height' | 'weight'

// Parse a raw input string in the given unit system against its range.
// Returns the metric equivalent, or an inline error. Empty input is
// "incomplete" (no error, no result) rather than invalid.
function parseField(raw: string, sys: UnitSystem, kind: FieldKind): { value: number | null; error: string | null } {
  const range = (kind === 'height' ? HEIGHT_RANGE : WEIGHT_RANGE)[sys]
  const trimmed = raw.trim()
  if (!trimmed) return { value: null, error: null }
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return { value: null, error: `Enter a number in ${range.unit}` }
  if (n < range.min || n > range.max) return { value: null, error: `Must be ${range.min}–${range.max} ${range.unit}` }
  const metric = sys === 'metric' ? n : n * (kind === 'height' ? IN_TO_CM : LB_TO_KG)
  return { value: metric, error: null }
}

// Devine ideal body weight (kg) from metric height. SPEC "Calculator formulas".
function devineIbw(heightCm: number, sex: Sex): number {
  const h = heightCm / IN_TO_CM
  const base = sex === 'male' ? 50 : 45.5
  return h >= 60 ? base + 2.3 * (h - 60) : base - 2.3 * (60 - h)
}

export default function CalculatorDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''
  const [calc, setCalc] = useState<Calculator | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setError(null)
    setCalc(null)
    getCalculator(slug)
      .then((c) => {
        if (!cancelled) setCalc(c)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        if (e instanceof ApiError && e.status === 404) setNotFound(true)
        else setError(e instanceof Error ? e.message : 'Something went wrong')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) return <Spinner />
  if (notFound) return <EmptyState title="Calculator not found" hint="Check the link or go back to the calculator list." />
  if (error) return <ErrorBanner message={error} />
  if (!calc) return null

  return (
    <div>
      <Link href="/calculators" className="text-sm font-medium text-brand hover:underline">
        ← Back to Calculators
      </Link>
      <div className="mt-3">
        <PageHeader title={calc.name} subtitle={calc.description ?? undefined} />
      </div>

      <Card>
        <CalculatorBody slug={slug} />
      </Card>

      <Card className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Formula &amp; governance</h2>
        <p className="mt-2 font-mono text-sm text-slate-800">{calc.formula}</p>
        {calc.source && (
          <p className="mt-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Source:</span> {calc.source}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
          <Badge color="teal">{calc.version}</Badge>
          {calc.reviewed_by && <span>Reviewed by {calc.reviewed_by}</span>}
          {calc.review_date && <span>· {formatDate(calc.review_date)}</span>}
        </div>
        <p className="mt-4 text-xs text-slate-500">{DISCLAIMER}</p>
      </Card>
    </div>
  )
}

function CalculatorBody({ slug }: { slug: string }) {
  switch (slug) {
    case 'ibw':
      return <IbwCalculator />
    case 'dosing-weight':
      return <DosingWeightCalculator />
    case 'bsa':
      return <BsaCalculator />
    default:
      return <EmptyState title="Calculator not found" />
  }
}

// --- shared field / toggle / result pieces ---

function UnitToggle({ sys, onChange }: { sys: UnitSystem; onChange: (s: UnitSystem) => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Units</span>
      <Button
        variant={sys === 'metric' ? 'primary' : 'secondary'}
        className="px-2.5 py-1 text-xs"
        onClick={() => onChange('metric')}
      >
        Metric (cm/kg)
      </Button>
      <Button
        variant={sys === 'imperial' ? 'primary' : 'secondary'}
        className="px-2.5 py-1 text-xs"
        onClick={() => onChange('imperial')}
      >
        Imperial (in/lb)
      </Button>
    </div>
  )
}

function NumberField({
  label,
  unit,
  value,
  onChange,
  error,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  error: string | null
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} <span className="font-normal text-slate-400">({unit})</span>
      </label>
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        placeholder={unit}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-slate-300 focus:border-brand focus:ring-brand',
        )}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function ResultPanel({ value, unit, children }: { value: string; unit: string; children: ReactNode }) {
  return (
    <div className="mt-5 rounded-lg bg-brand-soft p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-brand">Result</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">
        {value} <span className="text-lg font-medium text-slate-500">{unit}</span>
      </p>
      <div className="mt-1 space-y-0.5 text-sm text-slate-600">{children}</div>
    </div>
  )
}

function IncompleteHint() {
  return <p className="mt-5 text-sm text-slate-500">Enter valid values above to compute a result.</p>
}

// Convert a populated field's raw string from one unit system to the other.
function convertRaw(raw: string, from: UnitSystem, to: UnitSystem, kind: FieldKind): string {
  const parsed = parseField(raw, from, kind)
  if (parsed.value === null) return raw
  const out = to === 'metric' ? parsed.value : parsed.value / (kind === 'height' ? IN_TO_CM : LB_TO_KG)
  return String(Math.round(out * 10) / 10)
}

// --- ibw (Devine) ---

function IbwCalculator() {
  const [sys, setSys] = useState<UnitSystem>('metric')
  const [height, setHeight] = useState('')
  const [sex, setSex] = useState<Sex>('male')

  const h = parseField(height, sys, 'height')
  const heightUnit = sys === 'metric' ? 'cm' : 'in'
  const ibw = h.value !== null ? devineIbw(h.value, sex) : null

  const switchSys = (next: UnitSystem) => {
    if (next === sys) return
    setHeight(convertRaw(height, sys, next, 'height'))
    setSys(next)
  }

  return (
    <div>
      <UnitToggle sys={sys} onChange={switchSys} />
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Height" unit={heightUnit} value={height} onChange={setHeight} error={h.error} />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Sex</label>
          <Select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
        </div>
      </div>

      {ibw !== null ? (
        <ResultPanel value={ibw.toFixed(1)} unit="kg">
          <p>
            Ideal body weight (Devine) for a {sex === 'male' ? 'male' : 'female'} at {height.trim()}{' '}
            {heightUnit}.
          </p>
        </ResultPanel>
      ) : (
        <IncompleteHint />
      )}
    </div>
  )
}

// --- dosing-weight ---

function DosingWeightCalculator() {
  const [sys, setSys] = useState<UnitSystem>('metric')
  const [height, setHeight] = useState('')
  const [abw, setAbw] = useState('')
  const [sex, setSex] = useState<Sex>('male')

  const h = parseField(height, sys, 'height')
  const w = parseField(abw, sys, 'weight')
  const heightUnit = sys === 'metric' ? 'cm' : 'in'
  const weightUnit = sys === 'metric' ? 'kg' : 'lb'

  const ibw = h.value !== null ? devineIbw(h.value, sex) : null
  const ready = ibw !== null && w.value !== null
  let result: number | null = null
  let usedActual = false
  if (ready && ibw !== null && w.value !== null) {
    usedActual = w.value <= 1.3 * ibw
    result = usedActual ? w.value : ibw + 0.4 * (w.value - ibw)
  }

  const switchSys = (next: UnitSystem) => {
    if (next === sys) return
    setHeight(convertRaw(height, sys, next, 'height'))
    setAbw(convertRaw(abw, sys, next, 'weight'))
    setSys(next)
  }

  return (
    <div>
      <UnitToggle sys={sys} onChange={switchSys} />
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Actual body weight" unit={weightUnit} value={abw} onChange={setAbw} error={w.error} />
        <NumberField label="Height" unit={heightUnit} value={height} onChange={setHeight} error={h.error} />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Sex</label>
          <Select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
        </div>
      </div>

      {ibw !== null && (
        <p className="mt-4 text-sm text-slate-600">
          Computed IBW (Devine): <span className="font-medium text-slate-800">{ibw.toFixed(1)} kg</span>
        </p>
      )}

      {result !== null ? (
        <ResultPanel value={result.toFixed(1)} unit="kg">
          <p>
            {usedActual
              ? 'Actual body weight used (ABW ≤ 1.3 × IBW).'
              : 'Adjusted body weight used (ABW > 1.3 × IBW).'}
          </p>
        </ResultPanel>
      ) : (
        <IncompleteHint />
      )}
    </div>
  )
}

// --- bsa (Mosteller) ---

function BsaCalculator() {
  const [sys, setSys] = useState<UnitSystem>('metric')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')

  const h = parseField(height, sys, 'height')
  const w = parseField(weight, sys, 'weight')
  const heightUnit = sys === 'metric' ? 'cm' : 'in'
  const weightUnit = sys === 'metric' ? 'kg' : 'lb'

  const bsa = h.value !== null && w.value !== null ? Math.sqrt((h.value * w.value) / 3600) : null

  const switchSys = (next: UnitSystem) => {
    if (next === sys) return
    setHeight(convertRaw(height, sys, next, 'height'))
    setWeight(convertRaw(weight, sys, next, 'weight'))
    setSys(next)
  }

  return (
    <div>
      <UnitToggle sys={sys} onChange={switchSys} />
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Height" unit={heightUnit} value={height} onChange={setHeight} error={h.error} />
        <NumberField label="Weight" unit={weightUnit} value={weight} onChange={setWeight} error={w.error} />
      </div>

      {bsa !== null ? (
        <ResultPanel value={bsa.toFixed(2)} unit="m²">
          <p>Body surface area (Mosteller) from {height.trim()} {heightUnit} and {weight.trim()} {weightUnit}.</p>
        </ResultPanel>
      ) : (
        <IncompleteHint />
      )}
    </div>
  )
}
