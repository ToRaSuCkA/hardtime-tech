import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HardTime — Hardware & Software Lifecycle Tracker',
  description:
    'Check end-of-life, end-of-sale, and end-of-support dates for hardware and software products. Get replacement suggestions and cost estimates.',
  metadataBase: new URL('https://hardtime.tech'),
  openGraph: {
    title: 'HardTime — Lifecycle Intelligence',
    description: 'Know before your tech dies.',
    siteName: 'HardTime',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ht-bg text-ht-text">{children}</body>
    </html>
  )
}
