"use client"

import dynamic from 'next/dynamic'

const UsersPage = dynamic(() => import('./UsersPageClient'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export default function Page() {
  return <UsersPage />
}