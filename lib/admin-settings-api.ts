import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'
import type { WaitlistSettings, WaitlistSettingsUpdate } from '@/lib/product-feature-contracts'

const LAUNCH_SETTINGS_PATH = '/api:ledger-api/admin/launch-settings'

/** GET /api:ledger-api/admin/launch-settings */
export async function getLaunchSettings(): Promise<WaitlistSettings | null> {
  try {
    return await xanoRequest<WaitlistSettings>(LAUNCH_SETTINGS_PATH, { method: 'GET' }, { auth: true })
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** PATCH /api:ledger-api/admin/launch-settings */
export async function updateLaunchSettings(update: WaitlistSettingsUpdate): Promise<WaitlistSettings | null> {
  try {
    return await xanoRequest<WaitlistSettings>(
      LAUNCH_SETTINGS_PATH,
      { method: 'PATCH', body: JSON.stringify(update) },
      { auth: true },
    )
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
