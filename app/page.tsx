'use client'

import React, { useState, useEffect } from 'react'
import { Box, Typography, Card, CardActionArea, CardContent, Grid, Chip } from '@mui/material'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import CheckroomOutlinedIcon from '@mui/icons-material/CheckroomOutlined'
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined'
import Diversity3OutlinedIcon from '@mui/icons-material/Diversity3Outlined'
import DirectionsBusOutlinedIcon from '@mui/icons-material/DirectionsBusOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import WebOutlinedIcon from '@mui/icons-material/WebOutlined'
import NextLink from 'next/link'
import { getRoleFromSession, setTokensInSession, getTokensFromSession } from '@/utils/auth'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function Home() {
  const [mounted, setMounted] = useState(false)

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

  const cards = [
    {
      title: 'School Dashboard',
      description: 'Data and Insights to explore your school\'s uniform collection, reuse and impact',
      icon: <DashboardOutlinedIcon sx={{ fontSize: 32, mb: 2, color: '#1a1a1a' }} />,
      href: '/analytics/school',
      requiredRoles: ['TCC_ADMIN', 'SCHOOL_STAFF'],
    },
    {
      title: 'Uniform Tracker',
      description: 'Tracking collection, reuse, repurposing and recycling of uniforms',
      icon: <CheckroomOutlinedIcon sx={{ fontSize: 32, mb: 2, color: '#1a1a1a' }} />,
      href: '/inventory',
      requiredRoles: ['TCC_ADMIN', 'SCHOOL_STAFF', 'PSG'],
    },
    {
      title: 'Donation Drives',
      description: 'Resources and info materials to organise and manage donation drives',
      icon: <VolunteerActivismOutlinedIcon sx={{ fontSize: 32, mb: 2, color: '#1a1a1a' }} />,
      href: '/donation-drives',
      requiredRoles: ['TCC_ADMIN', 'SCHOOL_STAFF', 'PSG'],
    },
    {
      title: 'Collaborations & Products',
      description: 'Overview of sustainability projects and products made of repurposed uniforms',
      icon: <Diversity3OutlinedIcon sx={{ fontSize: 32, mb: 2, color: '#1a1a1a' }} />,
      href: '/analytics/configuration/products',
      requiredRoles: ['TCC_ADMIN'],
    },
    {
      title: 'Greener Routes to School',
      description: 'Supporting more sustainable journeys to and from school',
      icon: <DirectionsBusOutlinedIcon sx={{ fontSize: 32, mb: 2, color: '#1a1a1a' }} />,
      href: 'https://greener-routes.hansen-lim.dev',
      requiredRoles: ['TCC_ADMIN'],
      comingSoon: true,
    },
    {
      title: 'User Management',
      description: 'Manage users and their roles on this platform',
      icon: <PeopleOutlinedIcon sx={{ fontSize: 32, mb: 2, color: '#1a1a1a' }} />,
      href: '/users',
      requiredRoles: ['TCC_ADMIN'],
    },
    {
      title: 'Website Management',
      description: 'Manage the contents of the public website',
      icon: <WebOutlinedIcon sx={{ fontSize: 32, mb: 2, color: '#1a1a1a' }} />,
      onClick: async () => {
        let supabase = createSupabaseBrowserClient()
        let { data: { session } } = await supabase.auth.getSession()
        let accessToken = session?.access_token || getTokensFromSession().access_token
        let refreshToken = session?.refresh_token || getTokensFromSession().refresh_token
        if (session) {
          setTokensInSession(session.access_token, session.refresh_token)
        }
        if (accessToken && refreshToken) {
          window.open(
            `https://hansen-lim.dev/admin/auth/callback?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`,
            '_blank',
            'noopener,noreferrer'
          )
        }
      },
      requiredRoles: ['TCC_ADMIN'],
    },
  ]

  const canAccessCard = (requiredRoles: string[]) => {
    if (!requiredRoles.length) return true
    return requiredRoles.includes(userRole)
  }

  return (
    <Box sx={{ p: { xs: 4, md: 8 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1.5, color: '#1a1a1a' }}>
          {greeting}
        </Typography>
        <Typography variant="body1" sx={{ color: '#333', fontSize: '1.1rem', mb: 3 }}>
          Welcome to UTrack, a platform that helps schools and Parent Support Groups manage preloved school uniforms more effectively. Track donations, monitor reuse and repurposing activities, measure environmental and social impact, and generate insights to support more sustainable school communities. Together, we can extend the life of school uniforms, reduce textile waste, and make circularity visible, measurable and actionable.
        </Typography>
        <Typography variant="body1" sx={{ color: '#666', fontSize: '1.1rem' }}>
          What would you like to do today?
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {cards.map((card, index) => {
          const hasAccess = canAccessCard(card.requiredRoles)
          const isClickable = (Boolean(card.href) || Boolean(card.onClick)) && hasAccess

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 4,
                  border: '1px solid #e0e0e0',
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
                  height: '100%',
                  opacity: hasAccess ? 1 : 0.6,
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
                      {card.icon}
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 1 }}>
                        {card.title}
                        {card.comingSoon && <Chip label="Coming Soon!" size="small" variant="outlined" color="success" />}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.5 }}>
                        {card.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                ) : (
                  <Box sx={{ height: '100%', p: 2, cursor: card.href && !hasAccess ? 'not-allowed' : 'default' }}>
                    <CardContent>
                      {card.icon}
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 1 }}>
                        {card.title}
                        {card.comingSoon && <Chip label="Coming Soon!" size="small" variant="outlined" color="success" />}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.5 }}>
                        {card.description}
                      </Typography>
                      {!hasAccess && (
                        <Typography variant="caption" sx={{ color: '#b00020', display: 'block', mt: 1 }}>
                          You do not have access to this module.
                        </Typography>
                      )}
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
