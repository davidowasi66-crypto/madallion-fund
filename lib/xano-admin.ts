import { z } from "zod"

import { xanoRequest } from "@/lib/xano-auth"

const parseResponse = <T>(schema: z.ZodType<T>, response: unknown, label: string): T => {
  const parsed = schema.safeParse(response)

  if (!parsed.success) {
    console.error(`Invalid Xano response for ${label}:`, parsed.error.format())
    throw new Error(`Invalid Xano response for ${label}`)
  }

  return parsed.data
}

const request = async <T>(
  path: string,
  schema: z.ZodType<T, any, any>,
  options: {
    auth?: boolean
    query?: Record<string, string | number | undefined>
  } = {}
): Promise<T> => {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value))
    }
  }

  const url = query.size > 0 ? `${path}?${query.toString()}` : path
  const response = await xanoRequest<Record<string, unknown>>(url, {}, { auth: options.auth ?? false })

  return parseResponse(schema, response, path)
}

// ============================================================================
// 1. /api:ledger-api/admin/dashboard
// ============================================================================

export const LedgerAccountSchema = z.object({
  id: z.number(),
  created_at: z.number().nullable().optional(),
  ledger_id: z.number(),
  account_number: z.string(),
  name: z.string(),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  currency: z.string(),
  balance: z.number().nullable().optional(),
  debit_balance: z.number().nullable().optional(),
  credit_balance: z.number().nullable().optional(),
  status: z.enum(["active", "frozen", "closed"]).nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
})

export const LedgerRecentTransactionSchema = z.object({
  id: z.number(),
  created_at: z.number().nullable().optional(),
  ledger_id: z.number(),
  reference: z.string(),
  description: z.string(),
  currency: z.string(),
  amount: z.number(),
  status: z.enum(["posted", "pending", "void", "rejected"]).nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  user_id: z.number().nullable().optional(),
})

export const LedgerAdminDashboardResponseSchema = z.object({
  ledger_id: z.number(),
  kpis: z.object({
    total_assets_cents: z.number(),
    total_liabilities_cents: z.number(),
    total_equity_cents: z.number(),
    total_revenue_cents: z.number(),
    total_expenses_cents: z.number(),
    active_principal_cents: z.number(),
    accrued_yield_cents: z.number(),
    account_count: z.number(),
    active_investments_count: z.number(),
  }),
  trial_balance: z.object({
    is_balanced: z.boolean(),
    sum_debits_cents: z.number(),
    sum_credits_cents: z.number(),
    delta_cents: z.number(),
  }),
  recent_transactions: z.array(LedgerRecentTransactionSchema),
  accounts: z.array(LedgerAccountSchema),
})

export type LedgerAdminDashboardResponse = z.infer<typeof LedgerAdminDashboardResponseSchema>

// ============================================================================
// 2. /api:yYNRHo4K/fn_admin_dashboard
// ============================================================================

export const AdminDashboardAlertSchema = z.object({
  severity: z.enum(["critical", "warn"]),
  message: z.string(),
  value: z.number(),
})

export const AdminDashboardResponseSchema = z.object({
  alerts: z.array(AdminDashboardAlertSchema),
  position: z.object({
    assets: z.object({ total: z.number() }),
    liabilities: z.object({ total: z.number() }),
    equity: z.object({
      net: z.number(),
      surplus_ratio: z.number(),
      surplus_status: z.enum(["healthy", "tight", "underwater"]),
    }),
  }),
  aum: z.object({ active_principal: z.number() }),
  today: z.object({
    interest_accrued: z.number(),
    deposits: z.number(),
    withdrawals: z.number(),
    new_users: z.number(),
  }),
  counts: z.object({
    active_investors: z.number(),
    pending_withdrawals: z.number(),
    pending_deposits: z.number(),
    total_pending_approvals: z.number(),
  }),
  interest_forecast: z.object({
    daily_interest_due: z.number(),
    coverage_days: z.number(),
    projected_total: z.number(),
    maturities_30d: z.number(),
  }),
  charts: z.object({
    cashflow: z.array(z.any()),
    liability_vs_asset: z.array(
      z.object({
        name: z.string(),
        value: z.number(),
      })
    ),
    plan_mix: z.array(
      z.object({
        plan_id: z.number(),
        name: z.string(),
        principal: z.number(),
        investors_count: z.number(),
      })
    ),
  }),
  lifetime: z.object({
    total_credited: z.number(),
    total_debited: z.number(),
    net_inflow: z.number(),
  }),
  costs_to_date: z.number(),
  generated_at: z.number(),
})

export type AdminDashboardResponse = z.infer<typeof AdminDashboardResponseSchema>

// ============================================================================
// 3. /api:yYNRHo4K/fn_admin_pending
// ============================================================================

export const AdminPendingUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().nullable().optional(),
  created_at: z.number().nullable().optional(),
})

export const AdminPendingItemSchema = z.object({
  id: z.number(),
  reference: z.string(),
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  created_at: z.number(),
  age_seconds: z.number(),
  is_overdue: z.boolean(),
  user: AdminPendingUserSchema.nullable(),
  method: z.string(),
  gateway_ref: z.string(),
  tx_hash: z.string(),
  risk_flags: z.array(z.any()),
})

export const AdminPendingResponseSchema = z.object({
  kind: z.enum(["deposits", "withdrawals"]),
  items: z.array(AdminPendingItemSchema),
  curPage: z.number().nullable().optional(),
  nextPage: z.number().nullable().optional(),
  prevPage: z.number().nullable().optional(),
  itemsReceived: z.number(),
  generated_at: z.number(),
})

export type AdminPendingResponse = z.infer<typeof AdminPendingResponseSchema>

// ============================================================================
// 4. /api:yYNRHo4K/fn_admin_user_list
// ============================================================================

const optionalNumericValue = z.coerce.number().nullable().optional()

export const AdminUserListItemSchema = z.object({
  id: z.coerce.number(),
  name: z.string().nullish().transform((value) => value ?? "Unknown"),
  email: z.string().nullish(),
  role: z.string().nullish(),
  status: z.string().nullish(),
  kyc_status: z.string().nullish(),
  created_at: optionalNumericValue,
  invested: z.coerce.number().catch(0),
  earned: z.coerce.number().catch(0),
  wallet: z.coerce.number().catch(0),
  referral_earned: z.coerce.number().catch(0),
  referrals: z.coerce.number().catch(0),
  deposits_count: z.coerce.number().catch(0),
}).passthrough()

export const AdminUserListResponseSchema = z.preprocess((response) => {
  if (Array.isArray(response)) return { items: response }
  if (!response || typeof response !== "object") return response

  const payload = response as Record<string, unknown>
  const nested = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : undefined
  const source = nested ?? payload
  const items = source.items ?? source.users ?? source.records

  return {
    ...source,
    items,
    curPage: source.curPage ?? source.cur_page ?? source.page,
    nextPage: source.nextPage ?? source.next_page,
    prevPage: source.prevPage ?? source.prev_page,
    itemsReceived: source.itemsReceived ?? source.items_received ?? (Array.isArray(items) ? items.length : 0),
    generated_at: source.generated_at ?? source.generatedAt,
  }
}, z.object({
  items: z.array(AdminUserListItemSchema),
  curPage: optionalNumericValue,
  nextPage: optionalNumericValue,
  prevPage: optionalNumericValue,
  itemsReceived: z.coerce.number().catch(0),
  generated_at: optionalNumericValue,
}).passthrough())

export type AdminUserListResponse = z.infer<typeof AdminUserListResponseSchema>

// ============================================================================
// 5. /api:yYNRHo4K/fn_admin_investments
// ============================================================================

export const AdminInvestmentItemSchema = z.object({
  id: z.number(),
  user: z
    .object({
      id: z.number(),
      name: z.string(),
      email: z.string().nullable().optional(),
    })
    .nullable(),
  plan: z
    .object({
      id: z.number(),
      name: z.string(),
      daily_rate_bps: z.number(),
      duration_days: z.number(),
    })
    .nullable(),
  principal: z.number(),
  daily_rate_bps: z.number(),
  currency: z.string(),
  status: z.enum(["active", "completed", "cancelled"]).nullable().optional(),
  accrued_total: z.number().nullable().optional(),
  created_at: z.number().nullable().optional(),
  ends_at: z.number(),
  last_accrual_at: z.number().nullable().optional(),
})

export const AdminInvestmentsResponseSchema = z.object({
  items: z.array(AdminInvestmentItemSchema),
  curPage: z.number().nullable().optional(),
  nextPage: z.number().nullable().optional(),
  prevPage: z.number().nullable().optional(),
  itemsReceived: z.number(),
  generated_at: z.number(),
})

export type AdminInvestmentsResponse = z.infer<typeof AdminInvestmentsResponseSchema>

// ============================================================================
// Fetch helpers
// ============================================================================

export const getLedgerAdminDashboard = async (ledgerId = 1): Promise<LedgerAdminDashboardResponse> => {
  return request<LedgerAdminDashboardResponse>("/api:ledger-api/admin/dashboard", LedgerAdminDashboardResponseSchema, {
    auth: false,
    query: { ledger_id: ledgerId },
  })
}

export const getAdminDashboard = async (): Promise<AdminDashboardResponse> => {
  return request<AdminDashboardResponse>("/api:yYNRHo4K/fn_admin_dashboard", AdminDashboardResponseSchema, {
    auth: true,
  })
}

export const getAdminPending = async (params: { p_kind?: "deposits" | "withdrawals"; page?: number; per_page?: number } = {}): Promise<AdminPendingResponse> => {
  return request<AdminPendingResponse>("/api:yYNRHo4K/fn_admin_pending", AdminPendingResponseSchema, {
    auth: true,
    query: params,
  })
}

export const getAdminUserList = async (params: { p_search?: string; p_status?: "admin" | "member"; page?: number; per_page?: number } = {}): Promise<AdminUserListResponse> => {
  return request<AdminUserListResponse>("/api:yYNRHo4K/fn_admin_user_list", AdminUserListResponseSchema, {
    auth: true,
    query: params,
  })
}

export const getAdminInvestments = async (params: { page?: number; per_page?: number } = {}): Promise<AdminInvestmentsResponse> => {
  return request<AdminInvestmentsResponse>("/api:yYNRHo4K/fn_admin_investments", AdminInvestmentsResponseSchema, {
    auth: true,
    query: params,
  })
}

export const approveDeposit = async (payload: Record<string, unknown>) => {
  return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_approve_deposit", { method: "POST", body: JSON.stringify(payload) }, { auth: true })
}

export const settleWithdrawal = async (payload: Record<string, unknown>) => {
  return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_settle_withdrawal", { method: "POST", body: JSON.stringify(payload) }, { auth: true })
}

export const getAdminUser360 = async (id: number | string) => {
  return xanoRequest<Record<string, unknown>>(`/api:yYNRHo4K/fn_admin_user_360?p_user=${encodeURIComponent(String(id))}`, {}, { auth: true })
}

export default {
  getLedgerAdminDashboard,
  getAdminDashboard,
  getAdminPending,
  getAdminUserList,
  getAdminInvestments,
}
