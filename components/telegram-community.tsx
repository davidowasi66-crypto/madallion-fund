'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Headset, Users, X } from 'lucide-react'
import { getXanoSession } from '@/lib/xano-auth'

// Override with NEXT_PUBLIC_TELEGRAM_GROUP_URL / NEXT_PUBLIC_TELEGRAM_SUPPORT_URL.
const GROUP_URL = process.env.NEXT_PUBLIC_TELEGRAM_GROUP_URL || 'https://t.me/madallionfund'
const SUPPORT_URL = process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT_URL || GROUP_URL
const MEMBER_AREA_PREFIXES = ['/dashboard', '/affiliate']

function TelegramMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.94 4.3 18.9 19.1c-.23 1.02-.84 1.27-1.7.79l-4.7-3.47-2.27 2.19c-.25.25-.46.46-.94.46l.34-4.83 8.79-7.94c.38-.34-.08-.53-.59-.19L6.98 12.9 2.32 11.4c-1.01-.32-1.03-1.01.21-1.5L20.3 2.9c.84-.32 1.58.2 1.64 1.4Z" />
    </svg>
  )
}

export function TelegramCommunity() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [checkedSession, setCheckedSession] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const memberArea = MEMBER_AREA_PREFIXES.some((prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`))
  const visible = checkedSession && authenticated && memberArea

  useEffect(() => {
    setAuthenticated(Boolean(getXanoSession()?.authenticated))
    setCheckedSession(true)
  }, [pathname])

  useEffect(() => {
    if (!visible) setOpen(false)
  }, [visible])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  if (!visible) return null

  return (
    <div ref={rootRef} className="telegram-community">
      {open && (
        <div
          id="telegram-community-panel"
          className="telegram-community-panel"
          role="dialog"
          aria-label="Madallion Telegram community"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="telegram-mark">
                <TelegramMark size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#10251d]">Madallion community</p>
                <p className="text-[11px] text-[#708079]">Updates, support &amp; other investors</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Telegram panel"
              className="rounded-lg p-1.5 text-[#708079] transition hover:bg-[#eef4ee] hover:text-[#0b4537]"
            >
              <X size={15} />
            </button>
          </div>

          <p className="mt-3 text-xs leading-5 text-[#60716b]">
            Join the group for announcements, chat with support, and talk with other members of the fund.
          </p>

          <div className="mt-3 space-y-2">
            <a
              href={GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="telegram-action telegram-action-primary"
            >
              <span className="telegram-action-icon">
                <Users size={15} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Join the group</span>
                <span className="block text-[11px] opacity-75">Chat with other members</span>
              </span>
              <ArrowUpRight size={15} />
            </a>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="telegram-action"
            >
              <span className="telegram-action-icon">
                <Headset size={15} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Chat with support</span>
                <span className="block text-[11px] opacity-70">Talk to our team</span>
              </span>
              <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="telegram-community-panel"
        aria-label={open ? 'Close Telegram community' : 'Join our Telegram community'}
        className="telegram-fab"
      >
        {open ? <X size={22} /> : <TelegramMark />}
      </button>
    </div>
  )
}
