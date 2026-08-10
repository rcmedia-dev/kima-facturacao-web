/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@rcmedia-dev/kima-sdk'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
