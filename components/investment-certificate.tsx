'use client'

import { useState } from 'react'
import { Download, Link2, Share2 } from 'lucide-react'
import type { Investment } from '@/lib/investment-api'

const xml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)

const money = (value: number, currency: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)

function certificateSvg(plan: string, principal: string, earnings: string, currency: string, exportedAt: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b4537"/><stop offset="1" stop-color="#071a18"/></linearGradient><linearGradient id="glow" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#b9f47f"/><stop offset="1" stop-color="#8fe35c"/></linearGradient></defs>
    <rect width="1200" height="630" rx="38" fill="url(#bg)"/><rect x="54" y="54" width="1092" height="522" rx="28" fill="none" stroke="#ffffff" stroke-opacity=".13"/>
    <circle cx="1010" cy="165" r="142" fill="#b9f47f" fill-opacity=".06"/><path d="M90 116h78" stroke="url(#glow)" stroke-width="7" stroke-linecap="round"/>
    <text x="90" y="175" fill="#b9f47f" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="5">MADALLION FUND</text>
    <text x="90" y="255" fill="#ffffff" font-family="Arial,sans-serif" font-size="42" font-weight="700">Investment milestone</text>
    <text x="90" y="310" fill="#a8c7b8" font-family="Arial,sans-serif" font-size="22">${xml(plan)}</text>
    <text x="90" y="385" fill="#a8c7b8" font-family="Arial,sans-serif" font-size="17" letter-spacing="2">PRINCIPAL INVESTED · ${xml(currency)}</text>
    <text x="90" y="430" fill="#ffffff" font-family="Arial,sans-serif" font-size="34" font-weight="700">${xml(principal)}</text>
    <text x="560" y="385" fill="#a8c7b8" font-family="Arial,sans-serif" font-size="17" letter-spacing="2">LEDGER-REPORTED EARNINGS · ${xml(currency)}</text>
    <text x="560" y="430" fill="#b9f47f" font-family="Arial,sans-serif" font-size="34" font-weight="700">${xml(earnings)}</text>
    <line x1="90" y1="520" x2="1110" y2="520" stroke="#ffffff" stroke-opacity=".14"/>
    <text x="90" y="554" fill="#789589" font-family="Arial,sans-serif" font-size="15">Exported ${xml(exportedAt)} · Snapshot of the account ledger at export</text>
  </svg>`
}

async function renderPng(svg: string) {
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = source
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 630
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image export is not available in this browser.')
    context.drawImage(image, 0, 0)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Unable to create certificate image.'))), 'image/png')
    })
  } finally {
    URL.revokeObjectURL(source)
  }
}

function saveFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  URL.revokeObjectURL(url)
}

export function InvestmentCertificate({ investment }: { investment: Investment }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const accrued = investment.net_accrued_total ?? investment.accrued_total
  const authoritative = accrued !== undefined && accrued !== null && Number.isFinite(Number(accrued))
  const plan = investment.plan?.name ?? investment.plan_name ?? 'Madallion investment'
  const currencyCandidate = investment.currency ?? 'NGN'
  const currency = /^[A-Za-z]{3}$/.test(currencyCandidate) ? currencyCandidate.toUpperCase() : 'NGN'

  async function createFile() {
    if (!authoritative) throw new Error('A server-reported accrued total is not available yet.')
    const exportedAt = new Date().toLocaleDateString('en-NG', { dateStyle: 'medium' })
    const principal = money(Number(investment.principal), currency)
    const earnings = money(Number(accrued), currency)
    const blob = await renderPng(certificateSvg(plan, principal, earnings, currency, exportedAt))
    return new File([blob], 'madallion-investment-milestone.png', { type: 'image/png' })
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
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: 'Madallion investment milestone' })
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
    <section className="rounded-2xl border border-[#dfe8e2] bg-white p-4 lg:border-white/10 lg:bg-[#0b2420]" aria-label="Investment earnings certificate">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#65a85c] lg:text-[#b9f47f]">Earnings certificate</p>
          <p className="mt-1 text-sm font-semibold text-[#0b4537] lg:text-white">
            {authoritative ? `${money(Number(accrued), currency)} accrued` : 'Ledger total pending'}
          </p>
          <p className="mt-1 text-xs text-[#708079]">
            {authoritative ? 'Exports the server-reported account total as an image.' : 'A certificate is available after the ledger returns an accrued total.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" disabled={!authoritative || busy} onClick={() => void share()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b9f47f] px-3 py-2.5 text-xs font-semibold text-[#071a18] disabled:cursor-not-allowed disabled:opacity-40">
            <Share2 size={14} aria-hidden="true" /> Share image
          </button>
          <button type="button" disabled={!authoritative || busy} onClick={() => void download()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-xs font-semibold text-[#0b4537] disabled:cursor-not-allowed disabled:opacity-40 lg:border-white/15 lg:text-white">
            <Download size={14} aria-hidden="true" /> Download
          </button>
          <button type="button" disabled aria-label="Public link previews unavailable until the signed share API is enabled" title="A signed public-share API is required" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-xs font-semibold text-[#829088] disabled:cursor-not-allowed disabled:opacity-50 lg:border-white/15">
            <Link2 size={14} aria-hidden="true" /> Public link
          </button>
        </div>
      </div>
      {message && <p role="status" className="mt-3 text-xs text-[#60716b] lg:text-[#a8c7b8]">{message}</p>}
    </section>
  )
}
