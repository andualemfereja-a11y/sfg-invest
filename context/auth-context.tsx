// context/auth-context.tsx
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getSessionAction, loginAction, registerAction, logoutAction } from '@/app/actions/auth'
import { getFinancialSummaryAction } from '@/app/actions/financial'

export interface User {
  id: string
  firstName: string
  lastName: string
  phone: string
  baseBalance: number
  createdAt: Date
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  financial: {
    availableBalance: number
    totalInvested: number
    totalEarned: number
    todayEarnings: number
    pendingWithdrawals: number
  } | null
  login: (phone: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (data: {
    firstName: string
    lastName: string
    phone: string
    password: string
    confirmPassword: string
  }) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  refreshFinancial: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [financial, setFinancial] = useState<AuthContextType['financial']>(null)

  // Initialize user from database session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const result = await getSessionAction()
        if (result.ok && result.user) {
          setUser(result.user)
          // Fetch financial summary
          const financialResult = await getFinancialSummaryAction()
          if (financialResult.ok && financialResult.summary) {
            setFinancial(financialResult.summary)
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (phone: string, password: string) => {
    try {
      const result = await loginAction({ phone, password })
      if (result.ok) {
        // Refresh user data from database
        const sessionResult = await getSessionAction()
        if (sessionResult.ok && sessionResult.user) {
          setUser(sessionResult.user)
          // Fetch financial summary
          const financialResult = await getFinancialSummaryAction()
          if (financialResult.ok && financialResult.summary) {
            setFinancial(financialResult.summary)
          }
        }
        return { ok: true }
      }
      return { ok: false, error: result.error }
    } catch (error) {
      return { ok: false, error: 'Login failed' }
    }
  }

  const register = async (data: {
    firstName: string
    lastName: string
    phone: string
    password: string
    confirmPassword: string
  }) => {
    try {
      const result = await registerAction(data)
      if (result.ok) {
        // Refresh user data from database
        const sessionResult = await getSessionAction()
        if (sessionResult.ok && sessionResult.user) {
          setUser(sessionResult.user)
          // Fetch financial summary
          const financialResult = await getFinancialSummaryAction()
          if (financialResult.ok && financialResult.summary) {
            setFinancial(financialResult.summary)
          }
        }
        return { ok: true }
      }
      return { ok: false, error: result.error }
    } catch (error) {
      return { ok: false, error: 'Registration failed' }
    }
  }

  const logout = async () => {
    try {
      await logoutAction()
      setUser(null)
      setFinancial(null)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const refreshUser = async () => {
    try {
      const result = await getSessionAction()
      if (result.ok && result.user) {
        setUser(result.user)
      } else {
        setUser(null)
        setFinancial(null)
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  const refreshFinancial = async () => {
    try {
      const result = await getFinancialSummaryAction()
      if (result.ok && result.summary) {
        setFinancial(result.summary)
      }
    } catch (error) {
      console.error('Failed to refresh financial:', error)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: user !== null,
    financial,
    login,
    register,
    logout,
    refreshUser,
    refreshFinancial,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
