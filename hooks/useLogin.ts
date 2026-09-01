'use client'

import { useState } from 'react'
import { loginAction } from '@/app/actions/auth'

export function useLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (phone: string, password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const result = await loginAction({ phone, password })

      if (result.ok) {
        return true
      } else {
        setError(result.error ?? 'Failed to login')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { login, loading, error }
}
