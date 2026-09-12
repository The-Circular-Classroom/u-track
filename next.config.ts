import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable React strict mode for development
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  serverExternalPackages: ['pdfkit'],

  async rewrites() {
    return [
      {
        source: '/manifest.webmanifest',
        destination: '/manifest.json',
      },
    ]
  },
}

export default nextConfig
