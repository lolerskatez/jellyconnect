'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function AccountUnlockContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  
  useEffect(() => {
    // Check for userId in URL params (from SSO redirect)
    const userIdParam = searchParams.get('userId')
    if (userIdParam) {
      setUserId(userIdParam)
    }
  }, [searchParams])
  
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const res = await fetch('/api/auth/account-unlock/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        if (data.code === 'NO_EMAIL') {
          setError('No email address is associated with this account. Please contact your administrator.')
        } else if (data.code === 'NOT_DISABLED') {
          setError('Your account is not disabled. Please try logging in again.')
          setTimeout(() => router.push('/login'), 3000)
        } else {
          setError(data.error || 'Failed to request security code')
        }
        return
      }
      
      if (data.userId) {
        setUserId(data.userId)
      }
      setSuccess('Security code sent! Check your email.')
      setStep('verify')
      
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const res = await fetch('/api/auth/account-unlock/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts)
        }
        if (data.code === 'CODE_EXPIRED' || data.code === 'TOO_MANY_ATTEMPTS' || data.code === 'NO_REQUEST') {
          setStep('request')
          setCode('')
        }
        setError(data.error || 'Failed to verify code')
        return
      }
      
      setSuccess('Account unlocked successfully! Redirecting to login...')
      setTimeout(() => router.push('/login'), 2000)
      
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleResendCode = async () => {
    setStep('request')
    setCode('')
    setError('')
    setSuccess('')
    setRemainingAttempts(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Unlock Your Account</h1>
          <p className="mt-2 text-gray-400">
            {step === 'request' 
              ? 'Enter your email to receive a security code'
              : 'Enter the security code sent to your email'
            }
          </p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
        
        {step === 'request' ? (
          <form onSubmit={handleRequestCode} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!userId}
                disabled={loading}
                className="mt-1 block w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                placeholder="Enter your email address"
              />
              {userId && (
                <p className="mt-1 text-sm text-gray-500">
                  Or leave empty to use your account on file
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading || (!email && !userId)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Send Security Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-300">
                Security Code
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                disabled={loading}
                maxLength={6}
                className="mt-1 block w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                placeholder="000000"
              />
              {remainingAttempts !== null && remainingAttempts > 0 && (
                <p className="mt-1 text-sm text-yellow-500">
                  {remainingAttempts} attempts remaining
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Unlock Account'}
            </button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="text-indigo-400 hover:text-indigo-300 text-sm disabled:opacity-50"
              >
                Didn&apos;t receive the code? Send again
              </button>
            </div>
          </form>
        )}
        
        <div className="text-center">
          <a href="/login" className="text-gray-400 hover:text-gray-300 text-sm">
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}

export default function AccountUnlockPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <AccountUnlockContent />
    </Suspense>
  )
}
