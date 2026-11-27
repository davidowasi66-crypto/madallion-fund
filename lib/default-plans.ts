// Public plan terms used when the live catalogue has not loaded yet.
import type { Plan } from './investment-api'

export const DEFAULT_PLANS: Plan[] = [
  {
    id: -1,
    name: 'Starter',
    description: 'Build your base.',
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
    description: 'For steady growth.',
    roi_percent: 1.8,
    duration_days: 60,
    min_amount: 500_000,
    max_amount: 4_900_000,
    principal_returned: true,
    status: 'active',
    featured: true,
  },
  {
    id: -3,
    name: 'Diamond',
    description: 'Private wealth.',
    roi_percent: 2.4,
    duration_days: 90,
    min_amount: 5_000_000,
    max_amount: 25_000_000,
    principal_returned: true,
    status: 'active',
  },
]