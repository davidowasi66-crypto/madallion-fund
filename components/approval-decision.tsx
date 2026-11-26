'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { APPROVAL_REASONS, approvalErrorMessage, submitApprovalDecision, type ApprovalDecision, type ApprovalKind } from '@/lib/approval-review-api'

type PendingItem = { id: string | number; reference?: string }

export function ApprovalDecisionForm({
  kind,
  item,
  onRecorded,
}: {
  kind: ApprovalKind
  item: PendingItem
  onRecorded: () => Promise<unknown>
}) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<ApprovalDecision | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function decide(decision: ApprovalDecision) {
    if (!reason) {
      setError('Pick a reason before recording a decision.')
      return
    }
    setBusy(decision)
    setError('')
    setMessage('')
    try {
      const result = await submitApprovalDecision({
        kind,
        id: item.id,
        reference: item.reference,
        decision,
        reason,
        note,
      })

      if (!result) {
        setError('Approvals need the fn_approval_decision route in Xano. This request was left pending.')
        return
      }
      if (result.status === 'failed') {
        setError(approvalErrorMessage(result.message ?? 'The approval service rejected this decision.'))
        return
      }
      setMessage(
        result.message ??
          (result.requiresSecondApprover
            ? 'Decision recorded. A second approver must confirm before money moves.'
            : decision === 'approve'
              ? 'Approved and recorded with a reason.'
              : 'Rejected and recorded with a reason.'),
      )
      setReason('')
      setNote('')
      await onRecorded()
    } catch (cause) {
      setError(approvalErrorMessage(cause))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-w-[15rem] space-y-2">
      <select
        value={reason}
        onChange={(event) => {
          setReason(event.target.value)
          setError('')
        }}
        aria-label={`Reason for ${item.reference ?? 'this request'}`}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
      >
        <option value="">Select a reason…</option>
        {APPROVAL_REASONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Note (optional)"
        aria-label="Approval note"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy != null || !reason}
          onClick={() => void decide('approve')}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-xs text-emerald-300 disabled:opacity-50"
        >
          <Check size={13} aria-hidden="true" /> {busy === 'approve' ? 'Saving…' : 'Approve'}
        </button>
        <button
          type="button"
          disabled={busy != null || !reason}
          onClick={() => void decide('reject')}
          className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs text-red-300 disabled:opacity-50"
        >
          <X size={13} aria-hidden="true" /> {busy === 'reject' ? 'Saving…' : 'Reject'}
        </button>
      </div>
      {message && <p role="status" className="text-[11px] leading-4 text-emerald-300">{message}</p>}
      {error && (
        <div className="space-y-1">
          <p role="alert" className="text-[11px] leading-4 text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void onRecorded()}
            className="text-[11px] font-medium text-emerald-300 underline"
          >
            Refresh queue
          </button>
        </div>
      )}
    </div>
  )
}
