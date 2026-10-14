'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from './ui'
import { logout, useUser } from '@/lib/auth'
import { ROLE_LABELS } from '@/lib/types'
import { Badge } from './ui'

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/resources', label: 'Resources' },
  { href: '/programs', label: 'Programs' },
  { href: '/tracker', label: 'Tracker' },
  { href: '/study', label: 'Study' },
  { href: '/calculators', label: 'Calculators' },
  { href: '/community', label: 'Community' },
  { href: '/calendar', label: 'Calendar' },
]

export function SiteNav() {
  const pathname = usePathname()
  const { user } = useUser()
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-brand">
          Anesthesia Connect
        </Link>
        {!isAuthPage && (
          <nav className="flex flex-wrap items-center gap-x-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                  pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
                    ? 'bg-brand-soft text-brand'
                    : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
        {!isAuthPage && user && (
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{user.display_name}</span>
            <Badge color="teal">{ROLE_LABELS[user.role]}</Badge>
            <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-800">
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
