// app/layout.tsx
import './globals.css'
import Header from './components/Header'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Marketing-ARK',
  description: 'Marketing-ARK rep portal',
}

// Force dynamic rendering so auth state is never cached
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {/* Body width matches header via .container */}
        <main className="container" style={{ paddingTop: 32, paddingBottom: 56 }}>
          {children}
        </main>
      </body>
    </html>
  )
}
