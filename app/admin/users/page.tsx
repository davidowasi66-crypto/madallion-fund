'use client'

import { useEffect, useState } from 'react'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import { getAdminUserList, type AdminUserListResponse } from '@/lib/xano-admin'

const naira = (v: unknown) => `₦${Number(v || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminUserListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    getAdminUserList({ per_page: 50 })
      .then((payload) => {
        if (!mounted) return
        setData(payload)
      })
      .catch((cause) => {
        if (!mounted) return
        setError(cause instanceof Error ? cause.message : 'Unable to load users')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const rows = data?.items ?? []

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
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Invested</th>
                <th className="pb-3 pr-4">Wallet</th>
                <th className="pb-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-slate-800 text-slate-200">
                  <td className="py-3 pr-4 font-medium">{u.name}</td>
                  <td className="py-3 pr-4">{u.email ?? '—'}</td>
                  <td className="py-3 pr-4">{u.role ?? 'member'}</td>
                  <td className="py-3 pr-4">{naira(u.invested)}</td>
                  <td className="py-3 pr-4">{naira(u.wallet)}</td>
                  <td className="py-3 text-slate-400">
                    {u.created_at
                      ? new Date(Number(u.created_at) < 1e12 ? Number(u.created_at) * 1000 : u.created_at).toLocaleDateString('en-NG')
                      : '—'}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
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
