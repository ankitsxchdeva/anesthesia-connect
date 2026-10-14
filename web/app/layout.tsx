import type { Metadata } from 'next'
import './globals.css'
import { SiteNav } from '@/components/SiteNav'

export const metadata: Metadata = {
  title: 'Anesthesia Connect',
  description: 'Community, clinical learning, and career tools for future and practicing CRNAs.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SiteNav />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
