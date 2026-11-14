'use client'

import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

/** Hydration-safe mounted flag (false on server + first client paint). */
export function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}
