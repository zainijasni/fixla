import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fixla — Servis Tempatan Malaysia',
  description: 'Temui Technician berdekatan anda dengan mudah dan cepat.',
  manifest: '/manifest.json',
  themeColor: '#1D9E75'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
