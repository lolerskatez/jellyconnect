"use client"

import dynamic from 'next/dynamic'

const UserDetailPage = dynamic(() => import('./UserDetailPageClient'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export default function Page() {
  return <UserDetailPage />
}