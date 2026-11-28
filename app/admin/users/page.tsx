'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Eye, ShieldCheck, Users, X } from 'lucide-react'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import { ReportTable, formatReportCell, labelize } from '@/components/admin-report-table'
import { getAdminReferralLeaderboard, reportRows } from '@/lib/admin-reports-api'
import { adjustUserBalance } from '@/lib/admin-ops-api'
import { getAdminUser360, getAdminUserList, type AdminUserListResponse } from '@/lib/xano-admin'
import { isPendingRoute } from '@/lib/pending-route'

type UserRow = AdminUserListResponse['items'][number]

const naira = (value: unknown) => `₦${Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

async function loadUser360(id: number | string): Promise<Record<string, unknown> | null> {
  try {
    return await getAdminUser360(id)
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

export default function AdminUsersPage() {
  const users = useSWR<AdminUserListResponse>('admin-users', () => getAdminUserList({ per_page: 50 }), { revalidateOnFocus: false })
  const leaderboard = useSWR('admin-referral-leaderboard', getAdminReferralLeaderboard, { revalidateOnFocus: false })
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [adjust, setAdjust] = useState({ direction: 'credit', amount: '', currency: 'NGN', reason: '' })
  const [adjusting, setAdjusting] = useState(false)
  const [adjustMessage, setAdjustMessage] = useState('')
  const [adjustError, setAdjustError] = useState('')

  const rows = users.data?.items ?? []
  const leaderboardRows = reportRows(leaderboard.data, ['rows', 'items', 'leaderboard'])

  async function openUser(user: UserRow) {
    setSelectedUser(user)
    setProfile(null)
    setProfileError('')
    setProfileLoading(true)
    try {
      const payload = await loadUser360(user.id)
      setProfile(payload)
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : 'Unable to load this member.')
    } finally {
      setProfileLoading(false)
    }
  }

  async function submitAdjustment(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedUser) return
    setAdjusting(true)
    setAdjustMessage('')
    setAdjustError('')
    try {
      const result = await adjustUserBalance({
        userId: Number(selectedUser.id),
        direction: adjust.direction as 'credit' | 'debit',
        amountCents: Math.round(Number(adjust.amount) * 100),
        currency: adjust.currency,
        reason: adjust.reason,
      })
      if (!result) {
        setAdjustError('The fn_admin_adjust_balance route is not available in Xano.')
        return
      }
      setAdjustMessage('Balance adjustment posted.')
      setAdjust({ direction: 'credit', amount: '', currency: 'NGN', reason: '' })
      setProfile(await loadUser360(selectedUser.id))
      await users.mutate()
    } catch (cause) {
      setAdjustError(cause instanceof Error ? cause.message : 'Unable to post the adjustment.')
    } finally {
      setAdjusting(false)
    }
  }

  const accounts = reportRows(profile, ['accounts'])
  const investments = reportRows(profile, ['investments'])
  const transactions = reportRows(profile, ['transactions', 'entries'])
  const kyc = reportRows(profile, ['kyc', 'verifications'])
  const scalarEntries = Object.entries(profile ?? {}).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))

  return (
    <AdminShell eyebrow="Admin" title="Users">
      {users.error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">
          Unable to load users: {users.error.message}
        </p>
      )}

      <SectionCard title="Registered members" action={users.isLoading ? 'Loading' : `${rows.length} users`} icon={Users}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Invested</th>
                <th className="pb-3 pr-4">Wallet</th>
                <th className="pb-3 pr-4">Joined</th>
                <th className="pb-3 text-right">Profile</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id} className="border-t border-slate-800 text-slate-200">
                  <td className="py-3 pr-4 font-medium">{user.name}</td>
                  <td className="py-3 pr-4">{user.email ?? '—'}</td>
                  <td className="py-3 pr-4">{user.role ?? 'member'}</td>
                  <td className="py-3 pr-4">{naira(user.invested)}</td>
                  <td className="py-3 pr-4">{naira(user.wallet)}</td>
                  <td className="py-3 pr-4 text-slate-400">
                    {user.created_at
                      ? new Date(Number(user.created_at) < 1e12 ? Number(user.created_at) * 1000 : user.created_at).toLocaleDateString('en-NG')
                      : '—'}
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => void openUser(user)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-emerald-400/50">
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {!users.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500"><Users size={20} className="mx-auto mb-2 text-slate-600" />No users returned from fn_admin_user_list.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mt-6">
        <SectionCard title="Referral leaderboard" action={leaderboard.isLoading ? 'Loading' : leaderboard.data ? `${leaderboardRows.length} rows` : 'Route pending'} icon={ShieldCheck}>
          {leaderboard.data === null ? (
            <p className="py-6 text-sm text-slate-400">
              The admin leaderboard route is not available yet. Create <code className="text-emerald-300">fn_referral_leaderboard</code> in the admin group.
            </p>
          ) : (
            <ReportTable rows={leaderboardRows} empty="No referral rows returned." maxColumns={7} />
          )}
        </SectionCard>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#101a29] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[.18em] text-emerald-300">Member profile</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{selectedUser.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{selectedUser.email ?? 'No email'} · {selectedUser.role ?? 'member'}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} aria-label="Close member profile" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"><X size={18} /></button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <p className="text-[10px] uppercase tracking-[.12em] text-slate-500">Invested</p>
                <p className="mt-1 text-sm font-semibold text-white">{naira(selectedUser.invested)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <p className="text-[10px] uppercase tracking-[.12em] text-slate-500">Wallet</p>
                <p className="mt-1 text-sm font-semibold text-white">{naira(selectedUser.wallet)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <p className="text-[10px] uppercase tracking-[.12em] text-slate-500">Joined</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedUser.created_at
                    ? new Date(Number(selectedUser.created_at) < 1e12 ? Number(selectedUser.created_at) * 1000 : selectedUser.created_at).toLocaleDateString('en-NG')
                    : '—'}
                </p>
              </div>
            </div>

            {profileLoading && <p className="mt-6 text-sm text-slate-400">Loading member 360…</p>}
            {profileError && <p role="alert" className="mt-6 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{profileError}</p>}
            {!profileLoading && !profileError && profile === null && (
              <p className="mt-6 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">
                This needs the <code className="text-emerald-300">fn_admin_user_360</code> route in Xano.
              </p>
            )}

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h3 className="text-sm font-semibold text-white">Adjust wallet balance</h3>
              <form onSubmit={submitAdjustment} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label className="block"><span className="text-xs text-slate-400">Direction</span><select value={adjust.direction} onChange={(e) => setAdjust({ ...adjust, direction: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="credit">Credit</option><option value="debit">Debit</option></select></label>
                <label className="block"><span className="text-xs text-slate-400">Amount (NGN)</span><input required type="number" min="0.01" step="0.01" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
                <label className="block"><span className="text-xs text-slate-400">Currency</span><input required value={adjust.currency} onChange={(e) => setAdjust({ ...adjust, currency: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
                <label className="block lg:col-span-2"><span className="text-xs text-slate-400">Reason</span><input required value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
                <div className="flex items-end lg:col-span-5"><button disabled={adjusting} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"><ShieldCheck size={16} />{adjusting ? 'Posting…' : 'Post adjustment'}</button></div>
              </form>
              {adjustMessage && <p role="status" className="mt-3 text-xs text-emerald-300">{adjustMessage}</p>}
              {adjustError && <p role="alert" className="mt-3 text-xs text-red-300">{adjustError}</p>}
            </div>

            {profile && (
              <div className="mt-6 space-y-6">
                {scalarEntries.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white">Summary</h3>
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                      {scalarEntries.map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs">
                          <dt className="text-slate-500">{labelize(key)}</dt>
                          <dd className="text-slate-200">{formatReportCell(key, value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {accounts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white">Accounts</h3>
                    <ReportTable rows={accounts} empty="No accounts." maxColumns={7} />
                  </div>
                )}
                {investments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white">Investments</h3>
                    <ReportTable rows={investments} empty="No investments." maxColumns={7} />
                  </div>
                )}
                {transactions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white">Recent transactions</h3>
                    <ReportTable rows={transactions} empty="No transactions." maxColumns={7} />
                  </div>
                )}
                {kyc.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white">KYC</h3>
                    <ReportTable rows={kyc} empty="No KYC records." maxColumns={7} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  )
}
