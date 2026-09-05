'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Box, Typography } from '@mui/material'

const CARDS = [
  {
    title: 'Uniform Overview',
    description: 'View the uniforms from your school',
    href: '/inventory/uniform-overview',
    imageSrc: '/images/Graphic - Uniform Overview.png',
  },
  {
    title: 'Inventory Overview',
    description: 'Check the overall status of uniforms for use',
    href: '/inventory/overview',
    imageSrc: '/images/Graphic - Inventory Overview.png',
  },
  {
    title: 'Inventory by Items',
    description: 'View quantities of individual uniform items',
    href: '/inventory/items',
    imageSrc: '/images/Graphic - Inventory by Item.png',
  },
  {
    title: 'Update Inventory',
    description: 'Update the details and status of individual items',
    href: '/update-item-condition',
    imageSrc: '/images/Graphic - Update Inventory Status.png',
  },
]

export default function InventoryLandingPage() {
  return (
    <Box
      sx={{
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
      }}
    >
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, color: 'var(--color-darker)' }}
        >
          Uniform Tracker
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Track the collection, reuse, repurposing and recycling of school uniforms
        </Typography>
      </Box>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8 flex-1 auto-rows-fr">
        {CARDS.map(({ title, description, href, imageSrc }) => (
          <Link
            key={title}
            href={href}
            className="group flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-[var(--color-main)]/40 transition-all duration-200 p-8 h-full min-h-[280px]"
          >
            <div className="flex h-14 w-14 items-center justify-center mb-5">
              <Image
                src={imageSrc}
                alt={title}
                width={56}
                height={56}
                className="object-contain"
              />
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>

            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </Link>
        ))}
      </div>
    </Box>
  )
}
