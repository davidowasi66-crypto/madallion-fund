'use client'

import { AdminShell, SectionCard } from '@/components/admin-shell'
import { Check, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { xanoAdminPending } from '@/lib/xano-client'

const defaultRows = {
  deposits: [
    ['DEP-84291', 'Kemi Adeyemi', '₦2,500,000', 'Oct 28, 09:42', 'Matched'],
    ['DEP-84290', 'Ibrahim Musa', '₦850,000', 'Oct 28, 09:31', 'Matched'],
    ['DEP-84289', 'Chioma Eze', '₦5,000,000', 'Oct 28, 09:18', 'Matched'],
  ],
  users: [
    ['USR-3241', 'Aisha Bello', 'Verified', 'Gold Plan', 'Active'],
    ['USR-3242', 'Bola Kayode', 'KYC pending', 'Starter Plan', 'Review'],
    ['USR-3243', 'Tunde Adebayo', 'Verified', 'Diamond Plan', 'Active'],
  ],
} as const

export function OperationsPage({ kind, title, eyebrow, description, columns }: { kind: keyof typeof defaultRows; title: string; eyebrow: string; description: string; columns: string[] }) {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<string[][]>(defaultRows[kind])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const result = await xanoAdminPending(undefined, kind === 'deposits' ? 'deposits' : 'withdrawals', 1, 20).catch(() => null)

        if (!active) return

        const liveRows = result?.items ?? result?.data ?? result?.rows ?? defaultRows[kind]
        const mapped = Array.isArray(liveRows)
          ? liveRows.map((item: any) => {
              if (kind === 'deposits') {
                const id = item.id ?? item.deposit_id ?? item.reference ?? 'N/A'
                const user = item.user_name ?? item.user?.name ?? item.account_name ?? 'Unknown'
                const amount = item.amount ?? item.amount_ngn ?? 0
                const date = item.created_at ?? item.date ?? '—'
                const status = item.status ?? 'Pending'
                return [String(id), String(user), `₦${Number(amount).toLocaleString()}`, String(date), String(status)]
              }

              const id = item.user_id ?? item.id ?? item.user?.id ?? 'N/A'
              const user = item.name ?? item.user?.name ?? item.email ?? 'Unknown'
              const status = item.status ?? item.account_status ?? 'Active'
              const plan = item.plan_name ?? item.plan ?? item.package_name ?? 'Member'
              const stage = item.role ?? item.account_state ?? 'Active'
              return [String(id), String(user), String(status), String(plan), String(stage)]
            })
          : defaultRows[kind]

        setRows(mapped)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [kind])

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return rows
    return rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(normalizedQuery)))
  }, [query, rows])

  return (
    <AdminShell eyebrow={eyebrow} title={title}>
      <SectionCard title={title} action={loading ? 'Syncing' : 'Live'}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
            <Search size={14} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-40 bg-transparent outline-none placeholder:text-slate-500" />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <SlidersHorizontal size={14} />
            Filters
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-400">{description}</p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                {columns.map((column) => (
                  <th key={column} className="pb-3 pr-4">{column}</th>
                ))}
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={`${row[0]}-${index}`} className="border-t border-slate-800 text-slate-200">
                  {row.map((value, idx) => (
                    <td key={`${value}-${idx}`} className="py-3 pr-4">{value}</td>
                  ))}
                  <td className="py-3 pr-4"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[11px] text-emerald-300"><Check size={12} /> {row[row.length - 1]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AdminShell>
  )
}
