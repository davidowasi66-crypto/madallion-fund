'use client'

import { useEffect } from 'react'
import { getStoredXanoToken } from '@/lib/xano-auth'

export function SessionTokenCleanup() {
  useEffect(() => {
    getStoredXanoToken()
  }, [])

  return null
}
