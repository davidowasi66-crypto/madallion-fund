import type { Metadata } from 'next'
import { SecurityCenter } from '@/components/security-center'

export const metadata: Metadata = { title: 'Security — Madallion fund' }

export default function SecurityPage() {
  return <SecurityCenter />
}
