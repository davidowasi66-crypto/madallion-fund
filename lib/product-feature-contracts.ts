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

export type QuietHours = {
  enabled: boolean
  start_local: string
  end_local: string
  timezone: string
}

export type NotificationPreferences = {
  in_app_enabled: boolean
  categories: Record<NotificationCategory, boolean>
  quiet_hours: QuietHours
  updated_at: string
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

export type InvestmentFeeEntry = {
  id: string
  investment_id: string
  fee_type: InvestmentFeeType
  amount: number
  currency: string
  debit_source: 'interest_only' | 'available_balance'
  debit_account: InvestmentLedgerAccountCategory
  credit_account: InvestmentLedgerAccountCategory
  ledger_entry_id: string
  idempotency_key: string
  created_at: string
}

export type InvestmentFeePolicy = {
  currency: string
  management_fee_bps?: number
  performance_fee_bps?: number
  performance_hurdle_bps?: number
  withdrawal_fee_bps?: number
  early_exit_fee_bps?: number
  referral_commission_bps?: number
  effective_from: string
  source: 'server'
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
  referralSummary: { method: 'GET', path: '/api:ledger-api/referrals/me' },
  createReferralCode: { method: 'POST', path: '/api:ledger-api/referrals/code' },
  referralCredits: { method: 'GET', path: '/api:ledger-api/referrals/credits' },
  notificationList: { method: 'GET', path: '/api:ledger-api/notifications' },
  notificationPreferences: { method: 'GET|PATCH', path: '/api:ledger-api/notification-preferences' },
  waitlistSettings: { method: 'GET|PATCH', path: '/api:ledger-api/admin/launch-settings' },
  publicInvestmentShare: { method: 'GET|POST|DELETE', path: '/api:ledger-api/public-shares/{share_id}' },
  planLimitFields: {
    source: 'GET /api:ledger-api/plans',
    fields: ['featured', 'availability_status', 'soft_limits'] as const,
  },
  cohortAssignment: { method: 'GET', path: '/api:ledger-api/investments/{investment_id}/schedule' },
  autoRolloverPreference: { method: 'PATCH', path: '/api:ledger-api/investments/{investment_id}/rollover' },
  maturityResolution: { method: 'POST', path: '/api:ledger-api/investments/{investment_id}/maturity-resolution' },
  withdrawalWindow: { method: 'GET', path: '/api:ledger-api/investments/{investment_id}/withdrawal-window' },
  feePolicy: { method: 'GET', path: '/api:ledger-api/fee-policy' },
  investmentFeeEntries: { method: 'GET', path: '/api:ledger-api/investments/{investment_id}/fees' },
  signupReferralAttribution: {
    source: 'POST /api:auth/signup',
    field: 'referral_code',
  },
  referralCreditHistory: { method: 'GET', path: '/api:ledger-api/referrals/credits' },
  kycStatus: { method: 'GET', path: '/api:ledger-api/kyc/status' },
  kycSubmission: { method: 'POST', path: '/api:ledger-api/kyc/submissions' },
  depositProof: { method: 'POST', path: '/api:dKuEO75q/deposit/proof' },
  securityState: { method: 'GET', path: '/api:ledger-api/security/state' },
  twoFactorEnrollment: { method: 'POST', path: '/api:ledger-api/security/2fa/enroll' },
  twoFactorConfirm: { method: 'POST', path: '/api:ledger-api/security/2fa/confirm' },
  twoFactorDisable: { method: 'POST', path: '/api:ledger-api/security/2fa/disable' },
  securitySessionRevoke: { method: 'DELETE', path: '/api:ledger-api/security/sessions/{session_id}' },
  approvalDecision: { method: 'POST', path: '/api:yYNRHo4K/fn_approval_decision' },
} as const

export const PRODUCT_FEATURE_BACKEND_STATUS = {
  referrals: 'pending-xano-routes',
  notifications: 'ledger-activity-only',
  notificationPreferences: 'pending-xano-routes',
  waitlistSettings: 'pending-xano-routes',
  publicInvestmentShares: 'pending-signed-share-route',
  cohorts: 'pending-xano-scheduling-route',
  rollover: 'pending-xano-rollover-route',
  maturityResolution: 'pending-xano-maturity-route',
  feePolicy: 'pending-xano-fee-policy-route',
  feePosting: 'pending-xano-ledger-posting-route',
  planLimits: 'read-only-when-present-in-plan-response',
  referralCreditHistory: 'pending-xano-routes',
  kyc: 'pending-xano-routes',
  depositProof: 'pending-xano-routes',
  securityControls: 'pending-xano-routes',
  approvalDecisions: 'pending-xano-routes',
} as const
