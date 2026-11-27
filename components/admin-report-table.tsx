'use client'

const PREFERRED = [
  'created_at',
  'date',
  'timestamp',
  'reference',
  'type',
  'action',
  'actor',
  'user',
  'entity',
  'description',
  'amount',
  'debit',
  'credit',
  'balance',
  'status',
  'difference',
  'message',
  'name',
  'email',
  'plan',
  'principal',
  'accrued',
  'maturity',
]

export function labelize(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function formatReportCell(key: string, value: unknown): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    if (/(amount|balance|debit|credit|value|cost|revenue|expense|profit|principal|accrued|yield|difference|delta|fee|price)/i.test(key)) {
      return `₦${Math.round(value).toLocaleString('en-NG')}`
    }
    if (/(_at|date|time|timestamp|maturity)/i.test(key)) {
      const milliseconds = value < 1e12 ? value * 1000 : value
      return new Date(milliseconds).toLocaleString('en-NG')
    }
    return value.toLocaleString('en-NG')
  }
  if (typeof value === 'string') {
    if (/^\d{10,13}$/.test(value) && /(_at|date|time|timestamp|maturity)/i.test(key)) {
      const numeric = Number(value)
      const milliseconds = numeric < 1e12 ? numeric * 1000 : numeric
      return new Date(milliseconds).toLocaleString('en-NG')
    }
    return value
  }
  if (Array.isArray(value)) return `${value.length} items`
  if (typeof value === 'object') return '—'
  return String(value)
}

export function ReportTable({
  rows,
  empty,
  columns,
  maxColumns = 7,
}: {
  rows: Record<string, unknown>[]
  empty: string
  columns?: string[]
  maxColumns?: number
}) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>

  const available = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const ordered = [
    ...(columns ?? []),
    ...PREFERRED.filter((key) => available.includes(key)),
    ...available.filter((key) => !(columns ?? []).includes(key) && !PREFERRED.includes(key)),
  ]
  const visible = Array.from(new Set(ordered)).slice(0, maxColumns)

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="text-slate-400">
            {visible.map((key) => (
              <th key={key} className="pb-3 pr-4">{labelize(key)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id ?? row.reference ?? row.created_at ?? index)} className="border-t border-slate-800 text-slate-200">
              {visible.map((key) => (
                <td key={key} className="py-3 pr-4">{formatReportCell(key, row[key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
