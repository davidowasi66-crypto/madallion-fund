'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowDownLeft, Home, Layers, Users } from 'lucide-react'

const tabs = [
  { href: '/dashboard', label: 'Home', icon: Home, match: (p: string) => p === '/dashboard' },
  {
    href: '/dashboard/investments',
    label: 'Invest',
    icon: Layers,
    match: (p: string) => p.startsWith('/dashboard/investments') || p.startsWith('/plans'),
  },
  { href: '/affiliate', label: 'Team', icon: Users, match: (p: string) => p.startsWith('/affiliate') },
  {
    href: '/dashboard/wallet',
    label: 'Wallet',
    icon: ArrowDownLeft,
    match: (p: string) => p.startsWith('/dashboard/wallet') || p.startsWith('/dashboard/activity'),
  },
] as const

export function MemberTabBar() {
  const pathname = usePathname() || ''

  return (
    <nav className="member-tab-bar lg:hidden" aria-label="Member tabs">
      <div className="member-tab-bar-inner">
        {tabs.map((tab) => {
          const active = tab.match(pathname)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`member-tab ${active ? 'member-tab-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="member-tab-icon">
                <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="member-tab-label">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
