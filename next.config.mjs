const nextConfig = {
  env: {
    NEXT_PUBLIC_XANO_BASE_URL:
      process.env.NEXT_PUBLIC_XANO_BASE_URL ?? process.env.XANO_BASE_URL,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
