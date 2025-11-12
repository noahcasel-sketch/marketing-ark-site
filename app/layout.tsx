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
      <body className="min-h-dvh bg-gray-50">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
