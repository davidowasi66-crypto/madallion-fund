'use client'

import { useEffect } from 'react'
import { captureReferralCode } from '@/lib/referral-link'

/** Keeps ?ref= from any shared link available until the visitor creates an account. */
export function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    captureReferralCode(params.get('ref'))
  }, [])

  return null
}
