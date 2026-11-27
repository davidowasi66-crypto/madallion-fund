'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { dateLabel, makeQrDataUrl, money, renderPng, shareImage, stableShareId, xml } from '@/lib/shareable-image'

type Row = Record<string, any>

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function proofSvg({
  typeLabel,
  headline,
  holder,
  amount,
  status,
  date,
  reference,
  proofId,
  displayUrl,
  plansUrl,
  qrDataUrl,
  accentA,
  accentB,
}: {
  typeLabel: string
  headline: string
  holder: string
  amount: string
  status: string
  date: string
  reference: string
  proofId: string
  displayUrl: string
  plansUrl: string
  qrDataUrl: string
  accentA: string
  accentB: string
}) {
  const nameSize = holder.length > 28 ? 34 : holder.length > 20 ? 40 : 48
  const urlSize = displayUrl.length > 34 ? 24 : 28

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#062b24"/><stop offset=".55" stop-color="#0b4537"/><stop offset="1" stop-color="#071a18"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="${accentA}"/><stop offset="1" stop-color="${accentB}"/>
      </linearGradient>
      <radialGradient id="halo" cx=".5" cy=".5" r=".5">
        <stop stop-color="${accentB}" stop-opacity=".24"/><stop offset="1" stop-color="${accentB}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
        <path d="M44 0H0V44" fill="none" stroke="#ffffff" stroke-opacity=".025"/>
      </pattern>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="18"/>
      </filter>
    </defs>

    <rect width="1080" height="1350" fill="url(#bg)"/>
    <rect width="1080" height="1350" fill="url(#grid)"/>
    <circle cx="960" cy="120" r="290" fill="url(#halo)"/>
    <circle cx="90" cy="1240" r="240" fill="${accentB}" opacity=".07" filter="url(#soft)"/>
    <path d="M-40 1080C210 960 300 1180 560 1080s330-180 560-40" fill="none" stroke="${accentB}" stroke-opacity=".09" stroke-width="60"/>

    <rect x="38" y="38" width="1004" height="1274" rx="38" fill="none" stroke="${accentA}" stroke-opacity=".42" stroke-width="2"/>
    <rect x="54" y="54" width="972" height="1242" rx="28" fill="none" stroke="#ffffff" stroke-opacity=".12"/>

    <g transform="rotate(-24 540 675)" fill="${accentA}" fill-opacity=".055" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="700" letter-spacing="9" text-anchor="middle">
      <text x="540" y="430">VERIFIED BY MADALLION FUND</text>
      <text x="540" y="690">VERIFIED BY MADALLION FUND</text>
      <text x="540" y="950">VERIFIED BY MADALLION FUND</text>
    </g>

    <path d="M88 116h84" stroke="url(#accent)" stroke-width="7" stroke-linecap="round"/>
    <text x="88" y="176" fill="${accentA}" font-family="Arial,Helvetica,sans-serif" font-size="23" font-weight="700" letter-spacing="5">MADALLION FUND</text>
    <text x="88" y="238" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="52" font-weight="700">Payment Proof</text>
    <text x="88" y="278" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="19" letter-spacing="2">${xml(typeLabel)}</text>

    <g transform="translate(914 132)">
      <circle r="82" fill="${accentB}" opacity=".12"/>
      <circle r="66" fill="none" stroke="${accentA}" stroke-opacity=".58" stroke-width="2"/>
      <circle r="54" fill="none" stroke="${accentA}" stroke-opacity=".22" stroke-width="1"/>
      <path d="M-20 1l14 14 28-31" fill="none" stroke="${accentA}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="0" y="42" text-anchor="middle" fill="${accentA}" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" letter-spacing="2">VERIFIED</text>
    </g>

    <text x="88" y="356" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="17" letter-spacing="4">THIS CERTIFIES THAT</text>
    <text x="88" y="420" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="${nameSize}" font-weight="700">${xml(holder)}</text>
    <text x="88" y="456" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="17">completed a verified ${xml(typeLabel.toLowerCase().replace(' proof', ''))} on Madallion Fund.</text>
    <line x1="88" y1="492" x2="992" y2="492" stroke="#ffffff" stroke-opacity=".16"/>

    <rect x="88" y="528" width="904" height="222" rx="24" fill="${accentB}" fill-opacity=".1" stroke="${accentA}" stroke-opacity=".34"/>
    <text x="118" y="582" fill="${accentA}" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="3">${xml(headline.toUpperCase())}</text>
    <text x="118" y="684" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="64" font-weight="700">${xml(amount)}</text>
    <rect x="118" y="706" width="${Math.min(280, 52 + status.length * 12)}" height="28" rx="14" fill="${accentB}" fill-opacity=".18"/>
    <text x="132" y="726" fill="${accentA}" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700">${xml(status.toUpperCase())}</text>

    <rect x="88" y="790" width="432" height="146" rx="22" fill="#ffffff" fill-opacity=".055" stroke="#ffffff" stroke-opacity=".11"/>
    <text x="116" y="836" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="15" letter-spacing="3">TYPE</text>
    <text x="116" y="892" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="700">${xml(typeLabel.replace(' PROOF', ''))}</text>

    <rect x="560" y="790" width="432" height="146" rx="22" fill="#ffffff" fill-opacity=".055" stroke="#ffffff" stroke-opacity=".11"/>
    <text x="588" y="836" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="15" letter-spacing="3">DATE</text>
    <text x="588" y="892" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="700">${xml(date)}</text>

    <rect x="88" y="960" width="432" height="146" rx="22" fill="#ffffff" fill-opacity=".055" stroke="#ffffff" stroke-opacity=".11"/>
    <text x="116" y="1006" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="15" letter-spacing="3">REFERENCE</text>
    <text x="116" y="1062" fill="#ffffff" font-family="'Courier New',monospace" font-size="21" font-weight="700">${xml(reference)}</text>

    <rect x="560" y="960" width="432" height="146" rx="22" fill="#ffffff" fill-opacity=".055" stroke="#ffffff" stroke-opacity=".11"/>
    <text x="588" y="1006" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="15" letter-spacing="3">PROOF ID</text>
    <text x="588" y="1062" fill="#ffffff" font-family="'Courier New',monospace" font-size="21" font-weight="700">${xml(proofId)}</text>

    <text x="88" y="1138" fill="#789589" font-family="Arial,Helvetica,sans-serif" font-size="15">No account access is shared. Verify this proof at the link below.</text>
    <line x1="88" y1="1166" x2="992" y2="1166" stroke="#ffffff" stroke-opacity=".14"/>
    <text x="88" y="1216" fill="${accentA}" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" letter-spacing="3">VERIFY THIS PROOF</text>
    <text x="88" y="1262" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="${urlSize}" font-weight="700">${xml(displayUrl)}</text>
    <text x="88" y="1296" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="15">Explore plans: ${xml(plansUrl)}</text>
    <rect x="878" y="1166" width="124" height="124" rx="18" fill="#ffffff"/>
    <image href="${qrDataUrl}" x="890" y="1178" width="100" height="100" />
    <text x="940" y="1306" text-anchor="middle" fill="#789589" font-family="Arial,Helvetica,sans-serif" font-size="12">Verified by Madallion Fund</text>
  </svg>`
}

export function PaymentProof({ transaction, memberName = '' }: { transaction: Row; memberName?: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const status = String(transaction.status ?? 'recorded')
  const confirmed = /paid|completed|success|settled|credited|approved/i.test(status)
  if (!confirmed) return <span className="text-[10px] text-[#829088]">Proof after confirmation</span>

  const kind = String(transaction.type ?? transaction.kind ?? transaction.description ?? '').toLowerCase()
  const rawAmount = Number(transaction.amount ?? transaction.total_amount ?? transaction.value ?? 0)
  const withdrawal = /withdraw|cash.?out|payout|disburs/.test(kind) || rawAmount < 0
  const typeLabel = withdrawal ? 'WITHDRAWAL PROOF' : 'DEPOSIT PROOF'
  const headline = withdrawal ? 'Payout confirmed' : 'Deposit confirmed'
  const currency = String(transaction.currency ?? 'NGN')
  const amount = money(Math.abs(rawAmount), currency)
  const date = dateLabel(transaction.created_at ?? transaction.createdAt ?? transaction.posted_at ?? transaction.date, 'Today')
  const reference = String(transaction.reference ?? transaction.txn_ref ?? transaction.id ?? 'Ledger entry').slice(0, 34)
  const holder = memberName.trim() || 'Madallion member'
  const proofId = stableShareId(withdrawal ? 'MDF-P' : 'MDF-D', [transaction.id ?? reference, date, kind])

  async function share() {
    setBusy(true)
    setMessage('')
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://madallion-fund.vercel.app'
      const verifyUrl = `${origin}/proof?utm_source=payment_proof&utm_medium=share&utm_campaign=${withdrawal ? 'withdrawal' : 'deposit'}`
      const plansUrl = `${origin}/plans`
      const displayHost = origin.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const qrDataUrl = await makeQrDataUrl(verifyUrl)
      const svg = proofSvg({
        typeLabel,
        headline,
        holder,
        amount,
        status: titleCase(status),
        date,
        reference,
        proofId,
        displayUrl: `${displayHost}/proof`,
        plansUrl: `${displayHost}/plans`,
        qrDataUrl,
        accentA: withdrawal ? '#ffd38a' : '#d9f7a8',
        accentB: withdrawal ? '#f5b84b' : '#8fe35c',
      })
      const blob = await renderPng(svg, 1080, 1350)
      const file = new File([blob], `madallion-${withdrawal ? 'withdrawal' : 'deposit'}-proof-${proofId}.png`, { type: 'image/png' })
      const caption = `${headline} · Verify at ${verifyUrl} · Explore Madallion plans: ${plansUrl}`
      const result = await shareImage(file, 'Madallion payment proof', caption)
      setMessage(result === 'shared' ? 'Proof shared.' : 'Proof downloaded. Share the image anywhere.')
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return
      setMessage(cause instanceof Error ? cause.message : 'Unable to share this proof.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void share()}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-lg border border-[#dfe8e2] bg-white px-2 py-1 text-[10px] font-semibold text-[#0b4537] disabled:opacity-50 lg:border-white/15 lg:bg-transparent lg:text-[#b9f47f]"
      >
        <Share2 size={10} aria-hidden="true" /> {busy ? 'Preparing…' : 'Share proof'}
      </button>
      {message && <span role="status" className="max-w-40 text-right text-[9px] leading-3 text-[#829088]">{message}</span>}
    </span>
  )
}
