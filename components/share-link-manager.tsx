'use client'

import { useState } from 'react'
import { Copy, Link2, Trash2 } from 'lucide-react'
import { createPublicShare, revokePublicShare, safeShareUrl, shareExpiry } from '@/lib/share-api'
import { memberSafeError } from '@/lib/member-routes'
import { formatTimestamp } from '@/lib/pending-route'

const EXPIRY_OPTIONS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

export function ShareLinkManager({
  investmentId,
  existingUrl,
}: {
  investmentId: string | number
  existingUrl?: string
}) {
  const [link, setLink] = useState(() => safeShareUrl(existingUrl))
  const [shareId, setShareId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [days, setDays] = useState(30)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function create() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const share = await createPublicShare(investmentId, days)
      if (!share) {
        setError('Creating a signed link needs the public-shares route in Xano. Nothing was created.')
        return
      }
      setLink(share.url)
      setShareId(share.share_id)
      setExpiresAt(share.expires_at ?? shareExpiry(days))
      setMessage('Signed link created. Only people with the link can open it, until it expires.')
    } catch (cause) {
      setError(memberSafeError(cause, 'Unable to create a share link.'))
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setMessage('Link copied.')
    } catch {
      setError('Copy is unavailable in this browser — select the link and copy it manually.')
    }
  }

  async function revoke() {
    if (!shareId) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const revoked = await revokePublicShare(shareId)
      if (!revoked) {
        setError('Revoking needs the public-shares delete route in Xano. The link is still active.')
        return
      }
      setLink('')
      setShareId('')
      setExpiresAt('')
      setMessage('Link revoked. It can no longer be opened.')
    } catch (cause) {
      setError(memberSafeError(cause, 'Unable to revoke the share link.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-[#f4f8f3] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#829088]">Signed public share</p>

      {link ? (
        <>
          <p className="mt-2 break-all font-mono text-[11px] leading-4 text-[#0b4537]">{link}</p>
          {expiresAt && <p className="mt-1 text-[11px] text-[#829088]">Expires {formatTimestamp(expiresAt)}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe8e2] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#0b4537]"
            >
              <Copy size={12} aria-hidden="true" /> Copy
            </button>
            {shareId ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void revoke()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#f0d7d0] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#a3402a] disabled:opacity-50"
              >
                <Trash2 size={12} aria-hidden="true" /> Revoke
              </button>
            ) : (
              <span className="text-[11px] text-[#829088]">Issued by the ledger — revoke it from support.</span>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-[#829088]">
              Expires in
              <select
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="ml-2 rounded-lg border border-[#dfe8e2] bg-white px-2 py-1.5 text-[11px] text-[#0b4537]"
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.days} value={option.days}>{option.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void create()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0b4537] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
            >
              <Link2 size={12} aria-hidden="true" /> {busy ? 'Creating…' : 'Create link'}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-[#829088]">
            A signed link shows this investment snapshot only — no account access, and it stops working at expiry.
          </p>
        </>
      )}

      {message && <p role="status" className="mt-2 text-[11px] text-[#2f7a4a]">{message}</p>}
      {error && <p role="alert" className="mt-2 text-[11px] text-red-700">{error}</p>}
    </div>
  )
}
