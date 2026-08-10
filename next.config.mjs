/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@rcmedia-dev/kima-sdk'],
  env: {
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL || 'https://kima-facturacao.vercel.app',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
