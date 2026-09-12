import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './Providers'
import { getBaseUrl } from '@/lib/site-url'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  themeColor: '#69aa56',
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: 'U-Track - Circular Classroom',
  description: 'Uniform Inventory & Recycling Tracker',
  manifest: '/manifest.json',
  appleWebApp: {
    title: 'The Circular Classroom',
    statusBarStyle: 'default',
    capable: true,
  },
  icons: {
    icon: [
      { url: '/icon1.png', type: 'image/png' },
      { url: '/icon0.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
