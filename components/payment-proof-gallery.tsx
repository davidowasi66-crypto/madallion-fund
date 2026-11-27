'use client'

import useSWR from 'swr'
import { useMemo } from 'react'
import { BadgeCheck, ExternalLink, FileCheck2 } from 'lucide-react'
import { getPublicProofs, sampleProofs, type PublicProof } from '@/lib/public-proofs-api'
import { antiThrottleSwrConfig } from '@/lib/swr'

const money = (value: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'NGN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)

function proofDate(value: unknown): string {
  if (value == null || value === '') return 'Date not shown'
  const numeric = Number(value)
  const date = Number.isFinite(numeric) ? new Date(numeric < 1e12 ? numeric * 1000 : numeric) : new Date(String(value))
  return Number.isNaN(date.getTime())
    ? 'Date not shown'
    : date.toLocaleDateString('en-NG', { dateStyle: 'medium' })
}

function ProofCard({ proof }: { proof: PublicProof }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`flex size-8 items-center justify-center rounded-full ${proof.is_sample ? 'bg-[#fff4e5] text-[#b56b1f]' : 'bg-[#eef7eb] text-[#2f7a4a]'}`} aria-hidden="true">
            <FileCheck2 size={15} />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-[#0b4537]">{proof.kind}</p>
            <p className="mt-0.5 text-[10px] text-[#829088]">{proof.status}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] ${proof.is_sample ? 'bg-[#fff4e5] text-[#9a5b18]' : 'bg-emerald-50 text-emerald-800'}`}>
          {proof.is_sample ? 'Sample' : 'Live'}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-[#0b4537]">{money(proof.amount, proof.currency)}</p>
      <p className="mt-1 text-[11px] text-[#60716b]">{proof.member} · {proofDate(proof.created_at)}</p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#edf1ed] pt-2 text-[10px] text-[#829088]">
        <span className="font-mono">{proof.reference ?? 'Reference withheld'}</span>
        {proof.share_url ? (
          <a href={proof.share_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#2f7a4a]">
            Open proof <ExternalLink size={10} aria-hidden="true" />
          </a>
        ) : (
          <span>Illustrative</span>
        )}
      </div>
    </article>
  )
}

export function PaymentProofGallery() {
  const { data, isLoading } = useSWR('public-payment-proofs', getPublicProofs, antiThrottleSwrConfig)
  const samples = useMemo(() => sampleProofs(), [])
  const live = data?.rows ?? []

  return (
    <section className="mt-8 rounded-[2rem] border border-[#dfe8e2] bg-white p-4 shadow-sm sm:p-6" aria-labelledby="payment-proof-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#65a85c]">Payment proof</p>
          <h2 id="payment-proof-title" className="mt-1 text-xl font-semibold text-[#0b4537]">Permissioned receipts and payouts</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#708079]">
            Live cards appear only when the ledger returns a public, member-permissioned proof. Sample cards show the format and are never counted as live activity.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#eef7eb] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#2f7a4a]">
          <BadgeCheck size={12} aria-hidden="true" /> Permissioned
        </span>
      </div>

      {isLoading && <p className="mt-5 text-sm text-[#708079]">Checking for permissioned proof…</p>}

      {live.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#2f7a4a]">Live public proof</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((proof) => <ProofCard key={`live-${proof.id}`} proof={proof} />)}
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9a5b18]">Sample proof</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(live.length ? samples.slice(0, 3) : samples).map((proof) => (
            <ProofCard key={proof.id} proof={proof} />
          ))}
        </div>
      </div>
    </section>
  )
}
