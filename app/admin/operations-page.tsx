'use client'

import { useMemo, useState } from 'react'
import { Check, Search, SlidersHorizontal } from 'lucide-react'
import { AdminShell, SectionCard } from '@/components/admin-shell'

type OperationKind = 'deposits' | 'users' | 'withdrawals'
type OperationRow = string[]

const defaultRows: Record<OperationKind, OperationRow[]> = {
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
  withdrawals: [
    ['WDR-51021', 'Ibrahim Musa', '₦850,000', 'Oct 28, 09:31', 'Pending'],
    ['WDR-51020', 'Aisha Bello', '₦120,000', 'Oct 28, 08:54', 'Review'],
    ['WDR-51019', 'Tunde Adebayo', '₦75,000', 'Oct 27, 16:10', 'Approved'],
  ],
}

export function OperationsPage({
  kind,
  title,
  eyebrow,
  description,
  columns,
}: {
  kind: OperationKind
  title: string
  eyebrow: string
  description: string
  columns: string[]
}) {
  const [query, setQuery] = useState('')
  const rows = defaultRows[kind]
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return rows
    return rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(normalizedQuery)))
  }, [query, rows])

  return (
    <AdminShell eyebrow={eyebrow} title={title}>
      <SectionCard title={title} action="Sample data">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
            <Search size={14} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-40 bg-transparent outline-none placeholder:text-slate-500" />
          </label>
          <div className="flex items-center gap-2 text-sm text-slate-400"><SlidersHorizontal size={14} />Filters</div>
        </div>
        <p className="mb-4 text-sm text-slate-400">{description}</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="text-slate-400">{columns.map((column) => <th key={column} className="pb-3 pr-4">{column}</th>)}</tr></thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={`${row[0]}-${index}`} className="border-t border-slate-800 text-slate-200">
                  {row.map((value, cellIndex) => <td key={`${value}-${cellIndex}`} className="py-3 pr-4">{value}</td>)}
                  <td className="py-3"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[11px] text-emerald-300"><Check size={12} />{row[row.length - 1]}</span></td>
                </tr>
              ))}
              {filteredRows.length === 0 && <tr><td className="py-6 text-slate-400" colSpan={columns.length + 1}>No matching records.</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AdminShell>
  )
}
