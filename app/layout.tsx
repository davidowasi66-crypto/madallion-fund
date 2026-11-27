import { Analytics } from '@vercel/analytics/next'
import { ReferralCapture } from '@/components/referral-capture'
import { SessionTokenCleanup } from '@/components/session-token-cleanup'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Madallion Fund — NGN Investment Plans with Clear Terms',
  description:
    'Compare daily rates, terms, minimums, and maturity dates before you invest. Track deposits, accruals, and payouts in a ledger-backed account.',
  openGraph: {
    title: 'Madallion Fund — NGN Investment Plans with Clear Terms',
    description:
      'Compare plan terms before you commit and track every deposit, accrual, and payout in one account.',
    type: 'website',
  },
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fbfcfa',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ReferralCapture />
        <SessionTokenCleanup />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
