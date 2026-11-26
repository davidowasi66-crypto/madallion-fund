import type { Metadata } from 'next'
import { VerificationCenter } from '@/components/verification-center'

export const metadata: Metadata = { title: 'Identity verification — Madallion fund' }

export default function VerificationPage() {
  return <VerificationCenter />
}
