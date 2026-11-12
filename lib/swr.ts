'use client'

import type { SWRConfiguration } from 'swr'

// Anti-throttle SWR policy for Xano rate limits (HTTP 429).
let throttleUntil = 0

function statusOf(error: unknown): number {
  const match = /(?:^|\D)(429|500|502|503|504)(?:\D|$)/.exec(
    error instanceof Error ? error.message : String(error ?? ''),
  )
  return match ? Number(match[1]) : 0
}

export const antiThrottleSwrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  revalidateOnMount: true,
  refreshInterval: 0,
  dedupingInterval: 60_000,
  errorRetryCount: 2,
  errorRetryInterval: 5_000,
  onErrorRetry(error, _key, config, revalidate, { retryCount }) {
    if (statusOf(error) === 429 || statusOf(error) >= 500) {
      if (Date.now() < throttleUntil) return
      throttleUntil = Date.now() + 60_000
      if (retryCount >= 1) return
    }
    if (retryCount >= (config.errorRetryCount ?? 2)) return
    const timer = setTimeout(
      () => void revalidate({ retryCount }),
      (config.errorRetryInterval ?? 5_000) * (retryCount + 1),
    )
    if (typeof (timer as { unref?: () => void })?.unref === 'function') {
      ;(timer as { unref: () => void }).unref()
    }
  },
}
