import type { Metadata } from 'next'
import Providers from './providers'
import ErrorBoundary from '../components/ErrorBoundary'

import './globals.css'

export const metadata: Metadata = {
  title: 'JellyConnect',
  description: 'A Next.js project for Jellyfin authentication',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}