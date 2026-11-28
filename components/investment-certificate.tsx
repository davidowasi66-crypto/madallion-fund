'use client'

import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Download, Link2, Share2 } from 'lucide-react'
import type { Investment } from '@/lib/investment-api'
import { getInvestmentCertificate } from '@/lib/member-routes'
import { ShareLinkManager } from '@/components/share-link-manager'
import { dateLabel, makeQrDataUrl, money, renderPng, safeHttpsUrl, saveFile, toDate, xml } from '@/lib/shareable-image'

function stableCertificateId(investmentId: unknown, createdAt: unknown, plan: string): string {
  const serial = String(investmentId ?? '').replace(/\D/g, '').slice(-6).padStart(6, '0')
  const year = (toDate(createdAt) ?? new Date()).getFullYear()
  const seed = `${investmentId ?? 'investment'}|${createdAt ?? ''}|${plan}`
  let hash = 2166136261
  for (let index = 0; index < seed.length; index++) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619)
  }
  return `MDF-${year}-${serial}-${(hash >>> 0).toString(36).toUpperCase().padStart(5, '0').slice(-5)}`
}

function expectedReturn(investment: Investment, certificate: Record<string, any> | null | undefined): number {
  const direct = Number(certificate?.expected_return ?? certificate?.expected_return_amount)
  if (Number.isFinite(direct) && direct > 0) return direct
  const principal = Number(certificate?.principal ?? investment.principal ?? 0)
  const dailyRateBps = Number(certificate?.daily_rate_bps ?? investment.daily_rate_bps ?? investment.plan?.daily_rate_bps ?? 0)
  const durationDays = Number(certificate?.duration_days ?? investment.plan?.duration_days ?? 0)
  if (principal > 0 && dailyRateBps > 0 && durationDays > 0) {
    return principal * (dailyRateBps / 10_000) * durationDays
  }
  const roiPercent = Number(investment.plan?.roi_percent ?? 0)
  if (principal > 0 && roiPercent > 0) return principal * (roiPercent / 100)
  const accrued = Number(investment.net_accrued_total ?? investment.accrued_total)
  return Number.isFinite(accrued) ? accrued : 0
}

function certificateSvg({
  holder,
  plan,
  principal,
  expected,
  certificateId,
  issued,
  maturity,
  currency,
  displayUrl,
  qrDataUrl,
}: {
  holder: string
  plan: string
  principal: string
  expected: string
  certificateId: string
  issued: string
  maturity: string
  currency: string
  displayUrl: string
  qrDataUrl: string
}) {
  const nameSize = holder.length > 28 ? 36 : holder.length > 20 ? 44 : 54
  const planSize = plan.length > 30 ? 24 : plan.length > 20 ? 28 : 32
  const urlSize = displayUrl.length > 34 ? 25 : 30
  const qr = qrDataUrl
    ? `<image href="${qrDataUrl}" x="890" y="1130" width="100" height="100" />`
    : `<rect x="890" y="1130" width="100" height="100" rx="12" fill="#b9f47f" opacity=".2" /><text x="940" y="1188" text-anchor="middle" fill="#b9f47f" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700">SCAN</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#062b24"/><stop offset=".55" stop-color="#0b4537"/><stop offset="1" stop-color="#071a18"/>
      </linearGradient>
      <linearGradient id="lime" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="#d9f7a8"/><stop offset="1" stop-color="#8fe35c"/>
      </linearGradient>
      <radialGradient id="halo" cx=".5" cy=".5" r=".5">
        <stop stop-color="#b9f47f" stop-opacity=".22"/><stop offset="1" stop-color="#b9f47f" stop-opacity="0"/>
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
    <circle cx="90" cy="1240" r="240" fill="#f5b84b" opacity=".07" filter="url(#soft)"/>
    <path d="M-40 1080C210 960 300 1180 560 1080s330-180 560-40" fill="none" stroke="#b9f47f" stroke-opacity=".08" stroke-width="60"/>

    <rect x="38" y="38" width="1004" height="1274" rx="38" fill="none" stroke="#d9f7a8" stroke-opacity=".38" stroke-width="2"/>
    <rect x="54" y="54" width="972" height="1242" rx="28" fill="none" stroke="#ffffff" stroke-opacity=".12"/>

    <g transform="rotate(-24 540 675)" fill="#d9f7a8" fill-opacity=".055" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="700" letter-spacing="9" text-anchor="middle">
      <text x="540" y="430">VERIFIED BY MADALLION FUND</text>
      <text x="540" y="690">VERIFIED BY MADALLION FUND</text>
      <text x="540" y="950">VERIFIED BY MADALLION FUND</text>
    </g>

    <path d="M88 116h84" stroke="url(#lime)" stroke-width="7" stroke-linecap="round"/>
    <text x="88" y="176" fill="#b9f47f" font-family="Arial,Helvetica,sans-serif" font-size="23" font-weight="700" letter-spacing="5">MADALLION FUND</text>
    <text x="88" y="238" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="52" font-weight="700">Certificate of Investment</text>
    <text x="88" y="278" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="19" letter-spacing="1">Issued to a verified member · ${xml(currency)} portfolio</text>

    <g transform="translate(914 132)">
      <circle r="82" fill="#b9f47f" opacity=".1"/>
      <circle r="66" fill="none" stroke="#b9f47f" stroke-opacity=".55" stroke-width="2"/>
      <circle r="54" fill="none" stroke="#b9f47f" stroke-opacity=".22" stroke-width="1"/>
      <path d="M-20 1l14 14 28-31" fill="none" stroke="#d9f7a8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="0" y="42" text-anchor="middle" fill="#d9f7a8" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" letter-spacing="2">VERIFIED</text>
    </g>

    <text x="88" y="356" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="17" letter-spacing="4">THIS CERTIFIES THAT</text>
    <text x="88" y="430" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="${nameSize}" font-weight="700">${xml(holder)}</text>
    <line x1="88" y1="474" x2="992" y2="474" stroke="#ffffff" stroke-opacity=".16"/>

    <rect x="88" y="520" width="432" height="176" rx="22" fill="#ffffff" fill-opacity=".055" stroke="#ffffff" stroke-opacity=".11"/>
    <text x="116" y="570" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="15" letter-spacing="3">INVESTMENT AMOUNT</text>
    <text x="116" y="642" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="38" font-weight="700">${xml(principal)}</text>

    <rect x="560" y="520" width="432" height="176" rx="22" fill="#ffffff" fill-opacity=".055" stroke="#ffffff" stroke-opacity=".11"/>
    <text x="588" y="570" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="15" letter-spacing="3">PLAN TYPE</text>
    <text x="588" y="640" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="${planSize}" font-weight="700">${xml(plan)}</text>

    <rect x="88" y="724" width="432" height="176" rx="22" fill="#b9f47f" fill-opacity=".1" stroke="#b9f47f" stroke-opacity=".34"/>
    <text x="116" y="774" fill="#b9f47f" font-family="Arial,Helvetica,sans-serif" font-size="15" letter-spacing="3">EXPECTED RETURN</text>
    <text x="116" y="846" fill="#d9f7a8" font-family="Arial,Helvetica,sans-serif" font-size="38" font-weight="700">${xml(expected)}</text>

    <rect x="560" y="724" width="432" height="176" rx="22" fill="#ffffff" fill-opacity=".055" stroke="#ffffff" stroke-opacity=".11"/>
    <text x="588" y="774" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="15" letter-spacing="3">CERTIFICATE ID</text>
    <text x="588" y="834" fill="#ffffff" font-family="'Courier New',monospace" font-size="24" font-weight="700">${xml(certificateId)}</text>
    <text x="588" y="866" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="13">Unique to this investment</text>

    <text x="88" y="970" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="18">Issued ${xml(issued)} · Matures ${xml(maturity)}</text>
    <text x="88" y="1008" fill="#789589" font-family="Arial,Helvetica,sans-serif" font-size="15">Projected return based on the plan's stated daily rate and term. Investments carry risk.</text>

    <line x1="88" y1="1062" x2="992" y2="1062" stroke="#ffffff" stroke-opacity=".14"/>
    <text x="88" y="1118" fill="#b9f47f" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" letter-spacing="3">START YOUR OWN PLAN</text>
    <text x="88" y="1174" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="${urlSize}" font-weight="700">${xml(displayUrl)}</text>
    <text x="88" y="1214" fill="#9fc4b4" font-family="Arial,Helvetica,sans-serif" font-size="17">Scan the code or visit the link to explore Madallion plans.</text>
    <rect x="878" y="1118" width="124" height="124" rx="18" fill="#ffffff"/>
    ${qr}
    <text x="940" y="1272" text-anchor="middle" fill="#789589" font-family="Arial,Helvetica,sans-serif" font-size="12">Verified by Madallion Fund</text>
  </svg>`
}

export function InvestmentCertificate({ investment, memberName = '' }: { investment: Investment; memberName?: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [origin, setOrigin] = useState('https://madallion-fund.vercel.app')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const investmentId = investment.id
  const { data: certificate, isLoading: certificateLoading } = useSWR(
    investmentId == null ? null : ['investment-certificate', investmentId],
    () => getInvestmentCertificate(investmentId!),
  )

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  const plansUrl = `${origin}/plans?utm_source=investment_certificate&utm_medium=share&utm_campaign=member_certificate`
  const displayUrl = `${origin.replace(/^https?:\/\//, '').replace(/\/$/, '')}/plans`

  useEffect(() => {
    let active = true
    makeQrDataUrl(plansUrl)
      .then((value) => { if (active) setQrDataUrl(value) })
      .catch(() => undefined)
    return () => { active = false }
  }, [plansUrl])

  const principalValue = Number(certificate?.principal ?? investment.principal ?? 0)
  const canGenerate = Number.isFinite(principalValue) && principalValue > 0
  const currencyCandidate = String(certificate?.currency ?? investment.currency ?? 'NGN')
  const currency = /^[A-Za-z]{3}$/.test(currencyCandidate) ? currencyCandidate.toUpperCase() : 'NGN'
  const plan = String(certificate?.plan_name ?? investment.plan?.name ?? investment.plan_name ?? 'Madallion plan')
  const holder = String(certificate?.user_name ?? certificate?.member_name ?? certificate?.investor_name ?? memberName ?? '').trim() || 'Madallion investor'
  const publicShareUrl = safeHttpsUrl(certificate?.signed_share_url ?? certificate?.share_url)
  const verified = certificate?.is_verified === true || certificate?.is_verified === 'true'
  const certificateId = certificate?.certificate_id != null
    ? String(certificate.certificate_id)
    : stableCertificateId(investmentId, certificate?.issued_at ?? investment.created_at ?? investment.started_at, plan)
  const principal = certificate?.display_principal ?? money(principalValue, currency)
  const expectedValue = expectedReturn(investment, certificate)
  const expected = certificate?.expected_return_display ?? (expectedValue > 0 ? money(expectedValue, currency) : 'Pending')
  const issued = dateLabel(certificate?.issued_at ?? investment.created_at ?? investment.started_at, dateLabel(Date.now(), 'Today'))
  const maturity = dateLabel(
    certificate?.maturity_at ?? investment.maturity_at ?? investment.ends_at ?? investment.end_date ?? investment.maturity_date ?? investment.matures_at,
    'Per plan terms',
  )

  const svg = useMemo(
    () => certificateSvg({ holder, plan, principal, expected, certificateId, issued, maturity, currency, displayUrl, qrDataUrl }),
    [holder, plan, principal, expected, certificateId, issued, maturity, currency, displayUrl, qrDataUrl],
  )
  const previewSrc = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, [svg])

  async function createFile() {
    if (!canGenerate) throw new Error('A certificate becomes available when the investment has a principal amount.')
    const qr = qrDataUrl || await makeQrDataUrl(plansUrl)
    const exportSvg = certificateSvg({ holder, plan, principal, expected, certificateId, issued, maturity, currency, displayUrl, qrDataUrl: qr })
    const blob = await renderPng(exportSvg, 1080, 1350)
    return new File([blob], `madallion-certificate-${certificateId}.png`, { type: 'image/png' })
  }

  async function download() {
    setBusy(true)
    setMessage('')
    try {
      saveFile(await createFile())
      setMessage('Certificate image downloaded.')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to export this certificate.')
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    setBusy(true)
    setMessage('')
    try {
      const file = await createFile()
      const text = `My Madallion investment certificate · Explore plans: ${plansUrl}`
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: 'My Madallion investment certificate', text })
        setMessage('Certificate shared.')
      } else {
        saveFile(file)
        setMessage('Image sharing is unavailable here, so the certificate was downloaded instead.')
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return
      setMessage(cause instanceof Error ? cause.message : 'Unable to share this certificate.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-3xl border border-[#dfe8e2] bg-white p-4 lg:border-white/10 lg:bg-[#0b2420]" aria-label="Shareable investment certificate">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#65a85c] lg:text-[#b9f47f]">Shareable certificate</p>
          <h2 className="mt-1 text-sm font-semibold text-[#0b4537] lg:text-white">Your investment milestone, ready to share</h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-[#708079] lg:text-[#8eaea0]">
            Auto-generated from your ledger position. Share the image to WhatsApp Status, X, Instagram, or any platform. The QR code and link bring visitors back to Madallion plans.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 lg:border-emerald-400/20 lg:bg-emerald-400/10 lg:text-emerald-200">
          <CheckCircle2 size={13} aria-hidden="true" /> Verified by Madallion Fund
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#dfe8e2] bg-[#062b24] p-2 lg:border-white/10">
        <img src={previewSrc} alt={`Shareable Madallion investment certificate for ${holder}`} className="block w-full rounded-xl" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={!canGenerate || busy} onClick={() => void share()} className="soft-3d-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40">
          <Share2 size={14} aria-hidden="true" /> {busy ? 'Preparing…' : 'Share image'}
        </button>
        <button type="button" disabled={!canGenerate || busy} onClick={() => void download()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dfe8e2] px-4 py-2.5 text-xs font-semibold text-[#0b4537] disabled:cursor-not-allowed disabled:opacity-40 lg:border-white/15 lg:text-white">
          <Download size={14} aria-hidden="true" /> Download
        </button>
        {publicShareUrl ? (
          <a href={publicShareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dfe8e2] px-4 py-2.5 text-xs font-semibold text-[#0b4537] hover:bg-[#f4f8f3] lg:border-white/15 lg:text-white lg:hover:bg-white/5">
            <Link2 size={14} aria-hidden="true" /> Public link
          </a>
        ) : (
          <button type="button" disabled aria-label="Public certificate link is unavailable" title={certificateLoading ? 'Checking for a signed certificate link' : 'No signed public link was returned'} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dfe8e2] px-4 py-2.5 text-xs font-semibold text-[#829088] disabled:cursor-not-allowed disabled:opacity-50 lg:border-white/15">
            <Link2 size={14} aria-hidden="true" /> Public link
          </button>
        )}
        <span className="text-[11px] text-[#708079] lg:text-[#8eaea0]">{verified ? 'Signed public link verified.' : publicShareUrl ? 'Signed public link available.' : 'Image sharing works without a public link.'}</span>
      </div>

      {!canGenerate && <p className="mt-3 text-xs text-amber-700 lg:text-amber-200">The certificate appears once the investment has a principal amount.</p>}
      {investmentId != null && <ShareLinkManager investmentId={investmentId} existingUrl={publicShareUrl} />}
      {message && <p role="status" className="mt-3 text-xs text-[#60716b] lg:text-[#a8c7b8]">{message}</p>}
    </section>
  )
}
