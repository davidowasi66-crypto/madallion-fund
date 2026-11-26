export const REFERRAL_STORAGE_KEY = 'madallion_referral_code'

export function isValidReferralCode(value: string | null | undefined): boolean {
  return Boolean(value && /^[A-Za-z0-9_-]{1,64}$/.test(value.trim()))
}

export function captureReferralCode(value: string | null | undefined): void {
  if (typeof window === 'undefined') return
  const code = value?.trim()
  if (!code || !isValidReferralCode(code)) return
  try {
    window.localStorage.setItem(REFERRAL_STORAGE_KEY, code)
  } catch {
    /* storage can be blocked; the query string still works on the register page */
  }
}

export function storedReferralCode(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const code = window.localStorage.getItem(REFERRAL_STORAGE_KEY)?.trim()
    return isValidReferralCode(code) ? code : undefined
  } catch {
    return undefined
  }
}

export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(REFERRAL_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
