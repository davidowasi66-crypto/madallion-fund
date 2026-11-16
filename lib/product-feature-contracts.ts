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

export type InvestmentFeeEntry = {
  id: string
  investment_id: string
  fee_type: 'management' | 'payout' | 'referral' | 'tax' | 'other'
  amount: number
  currency: string
  debit_source: 'yield' | 'available_balance'
  ledger_entry_id: string
  idempotency_key: string
  created_at: string
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
  signupReferralAttribution: {
    source: 'POST /api:auth/signup',
    field: 'referral_code',
  },
} as const

export const PRODUCT_FEATURE_BACKEND_STATUS = {
  referrals: 'pending-xano-routes',
  notifications: 'ledger-activity-only',
  notificationPreferences: 'pending-xano-routes',
  waitlistSettings: 'pending-xano-routes',
  publicInvestmentShares: 'pending-signed-share-route',
  planLimits: 'read-only-when-present-in-plan-response',
} as const
