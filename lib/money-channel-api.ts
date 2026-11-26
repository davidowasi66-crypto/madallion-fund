import { xanoAdminFunctionRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

export type MoneyChannelRecord = {
  id: number
  name: string
  code: string
  type: string
  status: string
  instructions?: string | null
  bank_name?: string | null
  bank_account_name?: string | null
  bank_account_number?: string | null
  created_at?: number | null
}

export type MoneyChannelInput = {
  id?: number
  name: string
  code: string
  type: string
  status: string
  instructions?: string
  bank_name?: string
  bank_account_name?: string
  bank_account_number?: string
}

const asRecord = (value: unknown): Record<string, unknown> => {
  const body = value as Record<string, unknown> | null
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

function unwrapChannels(payload: unknown): MoneyChannelRecord[] {
  if (Array.isArray(payload)) return payload as MoneyChannelRecord[]
  const body = asRecord(payload)
  const data = asRecord(body.data)
  const candidates = [body.items, body.channels, body.data, data.items, data.channels]
  const found = candidates.find(Array.isArray)
  return (found ?? []) as MoneyChannelRecord[]
}

/** GET /api:yYNRHo4K/fn_admin_list_channels */
export async function listMoneyChannels(): Promise<MoneyChannelRecord[] | null> {
  try {
    return unwrapChannels(await xanoAdminFunctionRequest('/fn_admin_list_channels', { method: 'GET' }))
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** POST /api:yYNRHo4K/fn_admin_save_channel — creates when id is absent, updates when id is present. */
export async function saveMoneyChannel(input: MoneyChannelInput): Promise<Record<string, unknown> | null> {
  try {
    return await xanoAdminFunctionRequest('/fn_admin_save_channel', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** POST /api:yYNRHo4K/fn_admin_toggle_channel */
export async function toggleMoneyChannel(id: number, status: 'active' | 'paused'): Promise<Record<string, unknown> | null> {
  try {
    return await xanoAdminFunctionRequest('/fn_admin_toggle_channel', {
      method: 'POST',
      body: JSON.stringify({ p_channel_id: id, p_status: status }),
    })
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** DELETE /api:yYNRHo4K/fn_admin_channel/{id} */
export async function deleteMoneyChannel(id: number): Promise<Record<string, unknown> | null> {
  try {
    return await xanoAdminFunctionRequest(`/fn_admin_channel/${id}`, { method: 'DELETE' })
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
