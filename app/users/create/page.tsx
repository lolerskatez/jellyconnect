"use client"

import dynamic from 'next/dynamic'

const CreateUserPage = dynamic(() => import('./CreateUserPageClient'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export default function Page() {
  return <CreateUserPage />
}