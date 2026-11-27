'use client'

import { useState } from 'react'
import { Check, Copy, Mail, MessageCircle, Send, Share2 } from 'lucide-react'

function shareText(inviteUrl: string, code?: string): string {
  const codeLine = code ? ` Use invite code ${code}.` : ''
  return `I invest with Madallion Fund. Compare transparent NGN plans and start from ₦50,000.${codeLine} ${inviteUrl}`
}

export function ReferralShareActions({ inviteUrl, code }: { inviteUrl: string; code?: string }) {
  const [copied, setCopied] = useState(false)
  const text = shareText(inviteUrl, code)
  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(inviteUrl)

  async function copy() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  async function nativeShare() {
    if (!inviteUrl) return
    if (typeof navigator.share !== 'function') {
      await copy()
      return
    }
    try {
      await navigator.share({ title: 'Madallion Fund', text, url: inviteUrl })
    } catch {}
  }

  if (!inviteUrl) return null

  return (
    <section className="mt-3 rounded-2xl border border-[#dfe8e2] bg-[#f8fbf7] p-4" aria-label="Share your invite">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#65a85c]">Share the opportunity</p>
          <p className="mt-1 text-xs text-[#60716b]">Send your link or code. Rewards follow qualified invites.</p>
        </div>
        <Share2 size={16} className="shrink-0 text-[#65a85c]" aria-hidden="true" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => void nativeShare()}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0b4537] px-2.5 py-2 text-[11px] font-semibold text-white"
        >
          <Share2 size={12} aria-hidden="true" /> Share
        </button>
        <a
          href={`https://wa.me/?text=${encodedText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#dfe8e2] bg-white px-2.5 py-2 text-[11px] font-semibold text-[#0b4537]"
        >
          <MessageCircle size={12} aria-hidden="true" /> WhatsApp
        </a>
        <a
          href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#dfe8e2] bg-white px-2.5 py-2 text-[11px] font-semibold text-[#0b4537]"
        >
          <Send size={12} aria-hidden="true" /> Telegram
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent('Madallion Fund invite')}&body=${encodedText}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#dfe8e2] bg-white px-2.5 py-2 text-[11px] font-semibold text-[#0b4537]"
        >
          <Mail size={12} aria-hidden="true" /> Email
        </a>
      </div>

      <button
        type="button"
        onClick={() => void copy()}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#dfe8e2] bg-white px-3 py-2 text-[11px] font-semibold text-[#0b4537]"
      >
        {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
        {copied ? 'Invite message copied' : 'Copy invite message'}
      </button>
    </section>
  )
}
