// app/layout.tsx
import './globals.css'
import Header from './components/Header'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Marketing-ARK',
  description: 'Marketing-ARK rep portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {/* Body matches header width via the .container class */}
        <main className="container" style={{ paddingTop: 32, paddingBottom: 56 }}>
          {children}
        </main>
      </body>
    </html>
  )
}
