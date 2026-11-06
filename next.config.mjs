const nextConfig = {
  env: {
    NEXT_PUBLIC_XANO_BASE_URL:
      process.env.NEXT_PUBLIC_XANO_BASE_URL ?? process.env.XANO_BASE_URL,
    NEXT_PUBLIC_XANO_AUTH_URL:
      process.env.NEXT_PUBLIC_XANO_AUTH_URL ?? process.env.XANO_AUTH_URL,
    NEXT_PUBLIC_XANO_EVENT_LOG_URL:
      process.env.NEXT_PUBLIC_XANO_EVENT_LOG_URL ?? process.env.XANO_EVENT_LOG_URL,
    NEXT_PUBLIC_XANO_LEDGER_URL:
      process.env.NEXT_PUBLIC_XANO_LEDGER_URL ?? process.env.XANO_LEDGER_URL,
    NEXT_PUBLIC_XANO_ADMIN_URL:
      process.env.NEXT_PUBLIC_XANO_ADMIN_URL ?? process.env.XANO_ADMIN_URL,
    NEXT_PUBLIC_XANO_PAYMENT_URL:
      process.env.NEXT_PUBLIC_XANO_PAYMENT_URL ?? process.env.XANO_PAYMENT_URL,
  },
  typescript: { ignoreBuildErrors: false },
  images: { unoptimized: true },
}

export default nextConfig
