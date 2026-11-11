'use client'

import { useEffect, useState } from 'react'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import { xanoRequest } from '@/lib/xano-auth'

type Row = Record<string, any>

function unwrap(payload: any): Row[] {
  if (Array.isArray(payload)) return payload
  for (const key of ['users', 'items', 'data', 'members', 'rows']) {
    if (Array.isArray(payload?.[key])) return payload[key]
  }
  if (Array.isArray(payload?.data?.users)) return payload.data.users
  if (Array.isArray(payload?.data?.items)) return payload.data.items
  return []
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    xanoRequest<any>('/api:yYNRHo4K/fn_admin_user_list', { method: 'GET' }, { auth: true })
      .then((payload) => {
        if (!mounted) return
        setRows(unwrap(payload))
      })
      .catch((cause) => {
        if (!mounted) return
        setError(cause instanceof Error ? cause.message : 'Unable to load users')
      })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return (
    <AdminShell eyebrow="Admin" title="Users">
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <SectionCard title="Registered members" action={loading ? 'Loading' : `${rows.length} users`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Status / role</th>
                <th className="pb-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u, i) => (
                <tr key={u.id ?? i} className="border-t border-slate-800 text-slate-200">
                  <td className="py-3 pr-4 font-medium">{u.name ?? u.full_name ?? '—'}</td>
                  <td className="py-3 pr-4">{u.email ?? '—'}</td>
                  <td className="py-3 pr-4">{u.status ?? u.role ?? 'member'}</td>
                  <td className="py-3 text-slate-400">
                    {u.created_at
                      ? new Date(Number(u.created_at) < 1e12 ? Number(u.created_at) * 1000 : u.created_at).toLocaleDateString('en-NG')
                      : '—'}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No users returned from fn_admin_user_list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AdminShell>
  )
}
