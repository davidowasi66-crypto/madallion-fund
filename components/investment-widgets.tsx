'use client'

import useSWR from 'swr'
import { useMemo, useState } from 'react'
import { getMyCashflow, getMyInvestments, getMyWallet, unwrapList, type Investment, type Plan } from '@/lib/investment-api'

const money = (n: unknown) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
const rate = (plan: any) => Number(plan?.daily_rate_bps ?? plan?.roi_percent ?? 0) / (plan?.daily_rate_bps ? 100 : 1)
const date = (v: any) => v ? new Date(Number(v) < 1e12 ? Number(v) * 1000 : v).toLocaleDateString() : '—'

export function LiveMoneyCounters() {
  const { data: wallet } = useSWR('my-wallet', getMyWallet)
  const { data: cashflow } = useSWR('my-cashflow', getMyCashflow)
  const rows = unwrapList(cashflow)
  const deposits = rows.filter((r: any) => String(r.type ?? r.kind ?? '').toLowerCase().includes('deposit')).reduce((s: number, r: any) => s + Number(r.amount ?? r.value ?? 0), 0)
  const withdrawals = rows.filter((r: any) => String(r.type ?? r.kind ?? '').toLowerCase().includes('withdraw')).reduce((s: number, r: any) => s + Number(r.amount ?? r.value ?? 0), 0)
  const balance = (wallet as any)?.balance ?? (wallet as any)?.available_balance ?? 0
  return <div className="grid gap-4 sm:grid-cols-3"><Counter label="Available balance" value={money(balance)} tone="lime" /><Counter label="Total deposits" value={money((wallet as any)?.total_deposits ?? deposits)} /><Counter label="Total withdrawals" value={money((wallet as any)?.total_withdrawals ?? withdrawals)} /></div>
}
function Counter({ label, value, tone = 'default' }: { label: string; value: string; tone?: string }) { return <div className={`rounded-2xl border p-4 ${tone === 'lime' ? 'border-[#b9f47f]/30 bg-[#b9f47f]/10' : 'border-white/10 bg-[#0b2420]'}`}><p className="text-xs uppercase tracking-[.16em] text-[#8eaea0]">{label}</p><p className="mt-3 text-2xl font-semibold text-white">{value}</p></div> }

export function InvestmentProgress() {
  const { data, error, isLoading } = useSWR('my-investments', getMyInvestments)
  if (isLoading) return <p className="text-sm text-[#789589]">Loading active plans…</p>
  if (error) return <p className="text-sm text-[#ffb19d]">Investment data is temporarily unavailable.</p>
  const items = data ?? []
  if (!items.length) return <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-[#789589]">Your subscribed plans will appear here after you fund one.</p>
  return <div className="space-y-4">{items.map((investment, index) => <ProgressCard key={investment.id ?? index} investment={investment} />)}</div>
}
function ProgressCard({ investment }: { investment: Investment }) {
  const plan: any = investment.plan ?? {}
  const start = Number(investment.created_at ?? Date.now()); const end = Number(investment.ends_at ?? investment.maturity_at ?? start + Number(plan.duration_days ?? 0) * 86400000)
  const startMs = start < 1e12 ? start * 1000 : start; const endMs = end < 1e12 ? end * 1000 : end
  const percent = Math.max(0, Math.min(100, Number(investment.progress ?? ((Date.now() - startMs) / Math.max(1, endMs - startMs) * 100))))
  return <div className="rounded-2xl border border-white/10 bg-[#0e2b26] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{plan.name ?? `Plan #${investment.plan_id ?? investment.id}`}</p><p className="mt-1 text-xs text-[#789589]">{money(investment.principal)} principal · Matures {date(end)}</p></div><span className="rounded-full bg-[#b9f47f]/15 px-2.5 py-1 text-xs font-semibold text-[#b9f47f]">{Math.round(percent)}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#183e31]"><div className="h-full rounded-full bg-[#b9f47f] transition-all" style={{ width: `${percent}%` }} /></div><div className="mt-2 flex justify-between text-xs text-[#789589]"><span>Started {date(investment.created_at)}</span><span>{String(investment.status ?? 'active')}</span></div></div>
}

export function PlanCalculator({ plans }: { plans: Plan[] }) {
  const [amount, setAmount] = useState(100000); const [selected, setSelected] = useState(0)
  const plan: any = plans[selected] ?? {}; const days = Number(plan.duration_days ?? 30); const daily = rate(plan); const profit = amount * (daily / 100) * days
  return <div className="rounded-3xl border border-[#dfe8e2] bg-white p-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Plan calculator</p><h2 className="mt-2 text-2xl font-semibold text-[#0b4537]">See an illustrative outcome</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm text-[#60716b]">Amount<input type="number" min="0" value={amount} onChange={e => setAmount(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-[#dfe8e2] px-3 py-3 text-[#0b4537]" /></label><label className="text-sm text-[#60716b]">Plan<select value={selected} onChange={e => setSelected(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-[#dfe8e2] px-3 py-3 text-[#0b4537]">{plans.map((p, i) => <option key={p.id ?? i} value={i}>{p.name}</option>)}</select></label></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#eef7eb] p-4"><p className="text-xs text-[#60716b]">Illustrative return</p><p className="mt-1 text-xl font-semibold text-[#0b4537]">{money(profit)}</p></div><div className="rounded-xl bg-[#eef7eb] p-4"><p className="text-xs text-[#60716b]">At maturity</p><p className="mt-1 text-xl font-semibold text-[#0b4537]">{money(amount + profit)}</p></div></div><p className="mt-4 text-xs text-[#829088]">Illustration only. Returns are not guaranteed and may vary.</p></div>
}
