import type { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/auth/login',
          '/auth/signup',
          '/auth/forgot-password',
          '/auth/forget-password',
          '/faq',
        ],
        disallow: [
          '/api/',
          '/analytics/',
          '/configuration/',
          '/file-approval/',
          '/inventory/',
          '/school/',
          '/settings/',
          '/transaction/',
          '/update-item-condition/',
          '/users/',
          '/donation-drives/',
          '/auth/change-password',
          '/auth/reset-password',
          '/auth/set-new-password',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
