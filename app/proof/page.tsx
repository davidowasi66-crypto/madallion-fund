import Link from 'next/link'
import { ActivityTicker } from '@/components/activity-ticker'
import { PaymentProofGallery } from '@/components/payment-proof-gallery'

export default function ProofPage() {
  return (
    <main className="min-h-screen bg-[#f4f8f3] px-5 py-8 text-[#101d1a] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="font-bold text-[#0b4537]">Madallion fund</Link>
        <header className="mt-20 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Public ledger activity</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.06em] text-[#0b4537] sm:text-5xl">Proof, in public.</h1>
          <p className="mt-5 text-base leading-7 text-[#60716b] sm:text-lg">
            Recent deposits, withdrawals, and payouts appear here only when returned by the ledger. Investor names are masked.
          </p>
        </header>
        <section className="mt-10 overflow-hidden rounded-[2rem] border border-[#dfe8e2] bg-white p-4 shadow-sm sm:p-6" aria-label="Recent ledger activity">
          <ActivityTicker variant="landing" />
        </section>
        <PaymentProofGallery />
        <Link href="/register" className="mt-8 inline-flex rounded-xl bg-[#0b4537] px-5 py-3 text-sm font-semibold text-white">
          Create your account
        </Link>
      </div>
    </main>
  )
}
