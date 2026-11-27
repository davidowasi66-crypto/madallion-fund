import type { PlanSoftLimit } from '@/lib/investment-api'

export type ReferralCreditStatus = 'pending_hold' | 'available' | 'redeemed' | 'reversed'

export type ReferralCredit = {
  id: string
  referral_id: string
  amount: number
  currency: string
  status: ReferralCreditStatus
  hold_until: string
  created_at: string
  ledger_entry_id?: string
}

export type ReferralSummary = {
  referral_code: string
  referral_url: string
  available_credit: number
  pending_credit: number
  lifetime_credit: number
  credit_cap: number
  credit_currency: string
  hold_days: number
  credits: ReferralCredit[]
}

export type NotificationCategory = 'investment' | 'payment' | 'referral' | 'security' | 'product'

export type Notification = {
  id: string
  category: NotificationCategory
  title: string
  body: string
  created_at: string
  read_at: string | null
  action_url?: string
}

/** Mirrors the nine boolean delivery flags returned by GET /notification-preferences. */
export type NotificationPreferences = {
  email_alerts: boolean
  sms_alerts: boolean
  push_notifications: boolean
  deposit_confirmation: boolean
  withdrawal_updates: boolean
  maturity_reminders: boolean
  daily_accrual_digest: boolean
  security_alerts: boolean
  marketing_emails: boolean
  updated_at?: string
}

export type WaitlistSettings = {
  mode: 'open' | 'invite_only'
  registration_enabled: boolean
  waitlist_enabled: boolean
  updated_at: string
}

export type PublicInvestmentShare = {
  share_id: string
  title: string
  plan_name: string
  principal: number
  net_accrued_total: number
  currency: string
  accrued_as_of: string
  expires_at?: string
}

export type CreatePublicInvestmentShareRequest = {
  investment_id: string
  expires_at?: string
}

export type WaitlistSettingsUpdate = {
  mode: WaitlistSettings['mode']
  registration_enabled: boolean
  waitlist_enabled: boolean
  expected_updated_at?: string
}

export type InvestmentFeeType =
  | 'management'
  | 'performance'
  | 'withdrawal'
  | 'early_exit'
  | 'referral_commission'

export type InvestmentLedgerAccountCategory =
  | 'investment_principal'
  | 'investment_yield'
  | 'management_fee_payable'
  | 'performance_fee_payable'
  | 'withdrawal_fee_payable'
  | 'early_exit_fee_payable'
  | 'referral_commission_payable'

/** GET /investments/{investment_id}/fees returns a settlement calculation, not a ledger list. */
export type InvestmentFeeSummary = {
  investment_id?: string
  currency: string
  principal?: number
  accrued_total?: number
  is_early_exit?: boolean
  early_exit_fee?: number
  withdrawal_fee?: number
  management_fee?: number
  rollover_fee?: number
  total_fees?: number
  net_payout?: number
}

export type InvestmentFeePolicy = {
  currency: string
  management_fee_bps?: number
  withdrawal_fee_bps?: number
  withdrawal_fee_pct?: number
  deposit_fee_bps?: number
  rollover_fee_bps?: number
  early_exit_fee_bps?: number
  early_exit_penalty_pct?: number
  min_withdrawal_fee?: number
  max_withdrawal_fee?: number
  effective_from?: string
}

export type CohortAssignment = {
  investment_id: string
  cohort_id: string
  cohort_start_at: string
  accrual_start_at: string
  maturity_at: string
  source: 'server'
}

export type AutoRolloverPreference = {
  investment_id: string
  enabled: boolean
  effective_at: string
  source: 'server'
}

export type AutoRolloverPreferenceRequest = {
  enabled: boolean
  expected_updated_at?: string
}

export type MaturityResolutionRequest = {
  action: 'withdraw' | 'rollover'
  idempotency_key: string
}

export type WithdrawalWindow = {
  opens_at: string
  closes_at: string
  is_open: boolean
  source: 'server'
}

export type ProductPlanLimit = PlanSoftLimit & {
  warning_threshold?: number
  enforcement: 'soft' | 'hard'
}

export type InvestmentSchedule = {
  investment_id: string
  cohort_start_at: string
  accrual_start_at: string
  maturity_at: string
  withdrawal_window_ends_at?: string
  rollover_enabled: boolean
  next_rollover_at?: string
  currency: string
}

export const PRODUCT_FEATURE_API_CONTRACT = {
  referralSummary: { method: 'GET', path: '/api:ledger-api/referral/me' },
  referralCredits: { method: 'GET', path: '/api:ledger-api/referral/credits' },
  notificationList: { method: 'GET', path: '/api:ledger-api/notifications' },
  notificationPreferences: { method: 'GET|PUT', path: '/api:ledger-api/notification-preferences' },
  waitlistSettings: { method: 'GET|PATCH', path: '/api:ledger-api/admin/launch-settings' },
  publicInvestmentShare: { method: 'GET|POST', path: '/api:ledger-api/public-shares' },
  publicInvestmentShareRevoke: { method: 'DELETE', path: '/api:ledger-api/public-shares/{share_id}' },
  planLimitFields: {
    source: 'GET /api:ledger-api/plans',
    fields: ['featured', 'availability_status', 'soft_limits'] as const,
  },
  investmentSchedule: { method: 'GET', path: '/api:ledger-api/investments/{investment_id}/schedule' },
  autoRolloverPreference: { method: 'GET|PATCH', path: '/api:ledger-api/investments/{investment_id}/rollover' },
  maturityResolution: { method: 'GET|POST', path: '/api:ledger-api/investments/{investment_id}/maturity-resolution' },
  feePolicy: { method: 'GET', path: '/api:ledger-api/fee-policy' },
  investmentFeeSummary: { method: 'GET', path: '/api:ledger-api/investments/{investment_id}/fees' },
  signupReferralAttribution: {
    source: 'POST /api:auth/signup',
    field: 'referral_code',
  },
  referralCreditHistory: { method: 'GET', path: '/api:ledger-api/referral/credits' },
  depositProof: { method: 'GET|POST', path: '/api:ledger-api/deposit/proof' },
  approvalDecision: { method: 'POST', path: '/api:yYNRHo4K/fn_approval_decision' },
} as const

export const PRODUCT_FEATURE_BACKEND_STATUS = {
  referrals: 'live',
  notifications: 'live',
  notificationPreferences: 'live',
  waitlistSettings: 'pending-xano-routes',
  publicInvestmentShares: 'live',
  cohorts: 'live-schedule-only',
  rollover: 'live',
  maturityResolution: 'live',
  feePolicy: 'live',
  feePosting: 'live',
  planLimits: 'read-only-when-present-in-plan-response',
  referralCreditHistory: 'live',
  depositProof: 'live',
  approvalDecisions: 'live',
} as const
