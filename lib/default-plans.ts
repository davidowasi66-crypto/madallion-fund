// Illustrative plan catalogue used only when the live Xano catalogue cannot be read
// (public visitors / members without admin token). Rates mirror marketing tiers.
import type { Plan } from './investment-api'

export const DEFAULT_PLANS: Plan[] = [
  {
    id: -1,
    name: 'Starter',
    description: 'Build your base. Illustrative catalogue entry.',
    roi_percent: 1.2,
    duration_days: 30,
    min_amount: 50_000,
    max_amount: 499_000,
    principal_returned: true,
    status: 'active',
  },
  {
    id: -2,
    name: 'Gold',
    description: 'For steady growth. Illustrative catalogue entry.',
    roi_percent: 1.8,
    duration_days: 60,
    min_amount: 500_000,
    max_amount: 4_900_000,
    principal_returned: true,
    status: 'active',
  },
  {
    id: -3,
    name: 'Diamond',
    description: 'Private wealth. Illustrative catalogue entry.',
    roi_percent: 2.4,
    duration_days: 90,
    min_amount: 5_000_000,
    max_amount: 25_000_000,
    principal_returned: true,
    status: 'active',
  },
]
