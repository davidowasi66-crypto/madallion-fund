'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, ChevronDown, CircleDollarSign, FileText, LayoutDashboard, Menu, Settings, ShieldCheck, Users, Wallet, X } from 'lucide-react'
import { useState } from 'react'

const nav = [
  { href: '/admin', label: 'Treasury', icon: LayoutDashboard },
  { href: '/admin/deposits', label: 'Deposits', icon: Wallet },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: CircleDollarSign, badge: '7' },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/plans', label: 'Plans', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  return <div className="min-h-screen bg-[#eef5ef] text-[#10211b]">
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-[#d9e7dc] bg-[#f8fbf7]/95 p-5 backdrop-blur-xl transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between"><Link href="/" className="flex items-center gap-2.5 font-bold text-[#0b4537]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b4537] text-[#b9f47f]">M</span> Madallion fund</Link><button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
      <div className="mt-10 rounded-2xl border border-[#dbe9dd] bg-white/60 p-3"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#78a083]">Workspace</p><div className="mt-2 flex items-center justify-between"><span className="text-sm font-semibold text-[#0b4537]">Operations</span><ChevronDown size={15} className="text-[#789087]" /></div></div>
      <nav className="mt-8 space-y-1" aria-label="Admin navigation">{nav.map(({ href, label, icon: Icon, badge }) => { const active = pathname === href; return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? 'bg-[#dff5d5] text-[#0b4537]' : 'text-[#71847a] hover:bg-white/70 hover:text-[#0b4537]'}`}><Icon size={18} />{label}{badge && <span className="ml-auto rounded-full bg-[#f4d3a1] px-2 py-0.5 text-[10px] font-bold text-[#79511d]">{badge}</span>}</Link> })}</nav>
      <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-[#0b4537] p-4 text-white"><div className="flex items-center gap-2 text-xs font-semibold text-[#b9f47f]"><ShieldCheck size={15} /> Protected workspace</div><p className="mt-2 text-xs leading-5 text-white/60">Admin actions are logged and reviewed.</p></div>
    </aside>
    <div className="lg:pl-72"><header className="sticky top-0 z-30 border-b border-[#dce9df]/80 bg-[#eef5ef]/85 px-5 py-4 backdrop-blur-xl sm:px-8"><div className="flex items-center justify-between"><button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="ml-2 lg:ml-0"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#74a27d]">{eyebrow}</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.05em] text-[#0b4537]">{title}</h1></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-[#0b4537]">Ada Okafor</p><p className="text-[10px] text-[#829088]">Treasury admin</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b9f47f] text-xs font-bold text-[#0b4537]">AO</div></div></div></header><main className="mx-auto max-w-7xl p-5 sm:p-8">{children}</main></div>
  </div>
}

export function Metric({ label, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'good' | 'warn' }) { return <div className="glass-panel rounded-2xl p-5"><p className="text-xs text-[#7c9085]">{label}</p><p className="mt-3 text-2xl font-semibold tracking-[-.05em] text-[#0b4537]">{value}</p><p className={`mt-2 text-xs ${tone === 'warn' ? 'text-[#a36d2c]' : tone === 'good' ? 'text-[#43855c]' : 'text-[#829088]'}`}>{detail}</p></div> }

export function SectionCard({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) { return <section className="glass-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-base font-semibold text-[#0b4537]">{title}</h2>{action && <button className="text-xs font-semibold text-[#4d9061]">{action}</button>}</div><div className="mt-5">{children}</div></section> }
