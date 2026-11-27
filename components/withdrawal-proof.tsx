'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'

type Row = Record<string, any>

const money = (value: unknown, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'NGN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0)

const xml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)

function proofDate(value: unknown): string {
  const numeric = Number(value)
  const date = Number.isFinite(numeric) ? new Date(numeric < 1e12 ? numeric * 1000 : numeric) : new Date(String(value ?? ''))
  return Number.isNaN(date.getTime()) ? new Date().toLocaleDateString('en-NG', { dateStyle: 'medium' }) : date.toLocaleDateString('en-NG', { dateStyle: 'medium' })
}

function proofSvg(amount: string, status: string, date: string, reference: string, site: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b4537"/><stop offset="1" stop-color="#071a18"/></linearGradient><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#b9f47f"/><stop offset="1" stop-color="#8fe35c"/></linearGradient></defs>
    <rect width="1080" height="1350" rx="48" fill="url(#bg)"/>
    <rect x="54" y="54" width="972" height="1242" rx="34" fill="none" stroke="#ffffff" stroke-opacity=".13"/>
    <path d="M90 132h90" stroke="url(#accent)" stroke-width="8" stroke-linecap="round"/>
    <text x="90" y="196" fill="#b9f47f" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="6">MADALLION FUND</text>
    <text x="90" y="300" fill="#a8c7b8" font-family="Arial,sans-serif" font-size="22" letter-spacing="4">WITHDRAWAL PROOF</text>
    <text x="90" y="430" fill="#ffffff" font-family="Arial,sans-serif" font-size="42" font-weight="700">Payout recorded</text>
    <text x="90" y="610" fill="#a8c7b8" font-family="Arial,sans-serif" font-size="22" letter-spacing="2">AMOUNT</text>
    <text x="90" y="690" fill="#b9f47f" font-family="Arial,sans-serif" font-size="64" font-weight="700">${xml(amount)}</text>
    <text x="90" y="800" fill="#a8c7b8" font-family="Arial,sans-serif" font-size="22" letter-spacing="2">STATUS</text>
    <text x="90" y="850" fill="#ffffff" font-family="Arial,sans-serif" font-size="32" font-weight="700">${xml(status)}</text>
    <text x="90" y="960" fill="#a8c7b8" font-family="Arial,sans-serif" font-size="22" letter-spacing="2">DATE</text>
    <text x="90" y="1010" fill="#ffffff" font-family="Arial,sans-serif" font-size="32" font-weight="700">${xml(date)}</text>
    <text x="90" y="1120" fill="#a8c7b8" font-family="Arial,sans-serif" font-size="22" letter-spacing="2">REFERENCE</text>
    <text x="90" y="1170" fill="#ffffff" font-family="Arial,sans-serif" font-size="26" font-weight="700">${xml(reference)}</text>
    <line x1="90" y1="1230" x2="990" y2="1230" stroke="#ffffff" stroke-opacity=".14"/>
    <text x="90" y="1270" fill="#789589" font-family="Arial,sans-serif" font-size="17">Verified member payout · No account access is shared</text>
    <text x="990" y="1270" text-anchor="end" fill="#b9f47f" font-family="Arial,sans-serif" font-size="17">${xml(site)}/proof</text>
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
    canvas.width = 1080
    canvas.height = 1350
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image export is not available in this browser.')
    context.drawImage(image, 0, 0)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Unable to create proof image.'))), 'image/png')
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

export function WithdrawalProof({ transaction }: { transaction: Row }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const status = String(transaction.status ?? 'recorded')
  const confirmed = /paid|completed|success|settled|credited/i.test(status)
  if (!confirmed) return <span className="text-[10px] text-[#829088]">Proof after payout</span>

  const currency = String(transaction.currency ?? 'NGN')
  const amount = money(Math.abs(Number(transaction.amount ?? transaction.total_amount ?? transaction.value ?? 0)), currency)
  const date = proofDate(transaction.created_at ?? transaction.createdAt ?? transaction.posted_at ?? transaction.date)
  const reference = String(transaction.reference ?? transaction.txn_ref ?? transaction.id ?? 'Ledger entry').slice(0, 32)

  async function share() {
    setBusy(true)
    setMessage('')
    try {
      const site = window.location.origin
      const svg = proofSvg(amount, status, date, reference, site)
      const blob = await renderPng(svg)
      const file = new File([blob], 'madallion-withdrawal-proof.png', { type: 'image/png' })
      const caption = `Payout received from Madallion Fund. Explore NGN plans: ${site}/plans`
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: 'Madallion payout proof', text: caption })
        setMessage('Proof shared.')
      } else {
        saveFile(file)
        setMessage('Proof downloaded. Share the image with your invite link.')
      }
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
