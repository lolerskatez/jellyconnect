"use client"

import dynamic from 'next/dynamic'

const UsersPage = dynamic(() => import('../../users/UsersPageClient'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export default function Page() {
  return <UsersPage />
}