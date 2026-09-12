'use client'

import React, { useState, useEffect } from 'react'
import { Box, Typography, Card, CardActionArea, CardContent, Grid, Chip } from '@mui/material'
import Image from 'next/image'
import NextLink from 'next/link'
import { getRoleFromSession } from '@/utils/auth'
import { getPublicWebsiteConfig, redirectToPublicWebsiteStage } from '@/lib/auth/public-website'

interface DashboardCard {
  title: string
  description: string
  imageSrc: string
  href?: string
  onClick?: () => void | Promise<any>
  requiredRoles: string[]
  comingSoon?: boolean
  badge?: {
    label: string
    color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
    variant?: 'filled' | 'outlined'
  }
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const publicWebsiteConfig = getPublicWebsiteConfig()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const hour = new Date().getHours()
  const userRole = getRoleFromSession() || 'UNKNOWN'

  const greeting =
    hour > 6 && hour < 12
      ? 'Good Morning!'
      : hour >= 12 && hour < 18
        ? 'Good Afternoon!'
        : 'Good Evening!'

  const cards: DashboardCard[] = [
    {
      title: 'School Dashboard',
      description: 'Data and Insights to explore your school\'s uniform collection, reuse and impact',
      imageSrc: '/images/Graphic - School Circularity Dashboard.png',
      href: '/analytics/school',
      requiredRoles: ['TCC_ADMIN', 'SCHOOL_STAFF'],
    },
    {
      title: 'Uniform Tracker',
      description: 'Tracking collection, reuse, repurposing and recycling of uniforms',
      imageSrc: '/images/Graphic - Circular Uniform Tracker.png',
      href: '/inventory',
      requiredRoles: ['TCC_ADMIN', 'SCHOOL_STAFF', 'PSG'],
    },
    {
      title: 'Donation Drives',
      description: 'Resources and info materials to organise and manage donation drives',
      imageSrc: '/images/Graphic - Uniform Donation Drives.png',
      href: '/donation-drives',
      requiredRoles: ['TCC_ADMIN', 'SCHOOL_STAFF', 'PSG'],
    },
    {
      title: 'Collaborations & Products',
      description: 'Overview of sustainability projects and products made of repurposed uniforms',
      imageSrc: '/images/Graphic - Collaborations and Products.png',
      href: '/analytics/configuration/products',
      requiredRoles: ['TCC_ADMIN', 'SCHOOL_STAFF', 'PSG'],
    },
    {
      title: 'Greener Routes to School',
      description: 'Supporting more sustainable journeys to and from school',
      imageSrc: '/images/Graphic_Footsteps.jpg',
      href: 'https://greener-routes.hansen-lim.dev',
      requiredRoles: ['TCC_ADMIN'],
      comingSoon: true,
    },
    {
      title: 'User Management',
      description: 'Manage users and their roles on this platform',
      imageSrc: '/images/Graphic - PSG and User.jpg',
      href: '/users',
      requiredRoles: ['TCC_ADMIN'],
    },
    {
      title: 'Website Management (Production)',
      description: 'Manage the contents of the live public website',
      imageSrc: '/images/Graphic_Website Management.jpg',
      badge: {
        label: 'Production',
        color: 'primary',
        variant: 'outlined',
      },
      onClick: () => redirectToPublicWebsiteStage(publicWebsiteConfig.prodUrl),
      requiredRoles: ['TCC_ADMIN'],
    },
    {
      title: 'Website Management (Staging)',
      description: 'Manage and preview contents on the staging public website',
      imageSrc: '/images/Graphic_Website Management.jpg',
      badge: {
        label: 'Staging',
        color: 'warning',
        variant: 'outlined',
      },
      onClick: () => redirectToPublicWebsiteStage(publicWebsiteConfig.stagingUrl),
      requiredRoles: ['TCC_ADMIN'],
    },
    {
      title: 'Future Modules',
      description: 'Stay tuned for new modules',
      imageSrc: '/images/Graphic_Future Modules.png',
      href: '',
      requiredRoles: ['TCC_ADMIN', 'SCHOOL_STAFF', 'PSG'],
      comingSoon: true,
    },
  ]

  const canAccessCard = (requiredRoles: string[]) => {
    if (!requiredRoles.length) return true
    return requiredRoles.includes(userRole)
  }

  const visibleCards = cards.filter((card) => canAccessCard(card.requiredRoles))

  return (
    <Box sx={{ p: { xs: 4, md: 8 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
          {greeting}
        </Typography>
        <Typography variant="body1" sx={{ color: '#333', fontSize: '1.05rem', mb: 2, lineHeight: 1.6 }}>
          Welcome to U-Track, a platform that helps schools and Parent Support Groups manage preloved school uniforms more effectively. Track donations, monitor reuse and repurposing activities, measure environmental and social impact, and generate insights to support more sustainable school communities.
        </Typography>
        <Typography variant="body1" sx={{ color: '#333', fontSize: '1.05rem', mb: 3, lineHeight: 1.6 }}>
          Together, we can extend the life of school uniforms, reduce textile waste, and make circularity visible, measurable and actionable.
        </Typography>
        <Typography variant="body1" sx={{ color: '#666', fontSize: '1.05rem', fontWeight: 500 }}>
          What would you like to do today?
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {visibleCards.map((card, index) => {
          const isClickable = (Boolean(card.href) || Boolean(card.onClick)) && !card.comingSoon

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 4,
                  border: '1px solid #e0e0e0',
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  ...(isClickable && {
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.1)',
                    },
                  }),
                }}
              >
                {isClickable ? (
                  <CardActionArea
                    {...(card.href ? {
                      component: card.href.startsWith('http') ? 'a' : NextLink,
                      href: card.href,
                      ...(card.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})
                    } : {
                      onClick: card.onClick
                    })}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent>
                      <Box sx={{ width: 48, height: 48, position: 'relative', mb: 2 }}>
                        <Image
                          src={card.imageSrc}
                          alt={card.title}
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {card.title}
                        {card.badge && (
                          <Chip
                            label={card.badge.label}
                            size="small"
                            variant={card.badge.variant || 'outlined'}
                            color={card.badge.color || 'default'}
                            sx={{ fontWeight: 600, height: 22, fontSize: '0.75rem' }}
                          />
                        )}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.5 }}>
                        {card.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                ) : (
                  <Box sx={{ height: '100%', p: 2, cursor: card.comingSoon ? 'default' : 'default' }}>
                    <CardContent>
                      <Box sx={{ width: 48, height: 48, position: 'relative', mb: 2 }}>
                        <Image
                          src={card.imageSrc}
                          alt={card.title}
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {card.title}
                        {card.badge && (
                          <Chip
                            label={card.badge.label}
                            size="small"
                            variant={card.badge.variant || 'outlined'}
                            color={card.badge.color || 'default'}
                            sx={{ fontWeight: 600, height: 22, fontSize: '0.75rem' }}
                          />
                        )}
                        {card.comingSoon && <Chip label="Coming Soon!" size="small" variant="outlined" color="success" />}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.5 }}>
                        {card.description}
                      </Typography>
                    </CardContent>
                  </Box>
                )}
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}
