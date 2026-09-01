'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import type { Plan } from './types'
import { registerAction, loginAction, logoutAction, getSessionAction } from '@/app/actions/auth'
import { investAction, getInvestmentsAction, recalculateInvestmentAction } from '@/app/actions/investments'
import { requestWithdrawalAction, getWithdrawalsAction } from '@/app/actions/withdrawals'
import { getFinancialSummaryAction } from '@/app/actions/financial'
import { getDepositsAction } from '@/app/actions/deposits'

export interface User {
  id: string
  firstName: string
  lastName: string
  phone: string
  baseBalance: number | string
  createdAt: Date | string
}

export interface FinanceSummary {
  availableBalance: number
  totalInvested: number
  totalEarned: number
  todayEarnings: number
  pendingWithdrawals: number
}

export interface Investment {
  id: string
  userId: string
  planId: string
  planName: string
  amount: number | string
  profitRate: number | string
  returnDays: number
  startTimestamp: number | string
  endTimestamp: number | string
  accumulatedEarnings: number | string
  lastCalculatedTimestamp: number | string
  status: 'active' | 'completed'
}

export interface Withdrawal {
  id: string
  userId: string
  amount: number | string
  method: string
  telebirrPhone: string
  status: 'pending' | 'completed' | 'rejected'
  requestedAt: number | string
  pendingUntil: number | string
  completedAt: number | string | null
}

export interface Deposit {
  id: string
  userId: string
  amount: number | string
  method: string
  status: 'pending' | 'confirmed' | 'rejected'
  createdAt: Date | string
  updatedAt: Date | string
}

interface Result {
  ok: boolean
  error?: string
}

interface RegisterInput {
  firstName: string
  lastName: string
  phone: string
  password: string
  confirmPassword: string
}

interface AppContextValue {
  ready: boolean
  user: User | null
  investments: Investment[]
  deposits: Deposit[]
  withdrawals: Withdrawal[]
  summary: FinanceSummary
  register: (input: RegisterInput) => Promise<Result>
  login: (phone: string, password: string) => Promise<Result>
  logout: () => Promise<void>
  invest: (plan: Plan, amount: number) => Promise<Result>
  requestWithdrawal: (telebirrPhoneRaw: string, amount: number) => Promise<Result>
}

export const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [summary, setSummary] = useState<FinanceSummary>({
    availableBalance: 0,
    totalInvested: 0,
    totalEarned: 0,
    todayEarnings: 0,
    pendingWithdrawals: 0,
  })
  const bootstrapped = useRef(false)
  const router = useRouter()

  // Initialize user from database session on mount
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    const initializeAuth = async () => {
      try {
        const result = await getSessionAction()
        if (result.ok && result.user) {
          setUser(result.user)
          // Fetch financial summary and investments
          await Promise.all([
            refreshFinancial(),
            refreshInvestments(),
            refreshDeposits(),
            refreshWithdrawals(),
          ])
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        setReady(true)
      }
    }

    initializeAuth()
  }, [])

  // Recalculate investments every 15 seconds
  useEffect(() => {
    if (!ready || !user) return

    const recalculateAll = async () => {
      try {
        for (const inv of investments) {
          if (inv.status === 'active') {
            await recalculateInvestmentAction(inv.id)
          }
        }
        await refreshFinancial()
      } catch (error) {
        console.error('Failed to recalculate investments:', error)
      }
    }

    const interval = setInterval(recalculateAll, 15000)
    return () => clearInterval(interval)
  }, [ready, user, investments])

  const refreshFinancial = useCallback(async () => {
    try {
      const result = await getFinancialSummaryAction()
      if (result.ok && result.summary) {
        setSummary(result.summary)
      }
    } catch (error) {
      console.error('Failed to refresh financial:', error)
    }
  }, [])

  const refreshInvestments = useCallback(async () => {
    try {
      const result = await getInvestmentsAction()
      if (result.ok && result.investments) {
        setInvestments(result.investments)
      }
    } catch (error) {
      console.error('Failed to refresh investments:', error)
    }
  }, [])

  const refreshDeposits = useCallback(async () => {
    try {
      const result = await getDepositsAction()
      if (result.ok && result.deposits) {
        setDeposits(result.deposits)
      }
    } catch (error) {
      console.error('Failed to refresh deposits:', error)
    }
  }, [])

  const refreshWithdrawals = useCallback(async () => {
    try {
      const result = await getWithdrawalsAction()
      if (result.ok && result.withdrawals) {
        setWithdrawals(result.withdrawals)
      }
    } catch (error) {
      console.error('Failed to refresh withdrawals:', error)
    }
  }, [])

  const register = useCallback(
    async (input: RegisterInput): Promise<Result> => {
      try {
        const result = await registerAction(input)
        if (result.ok) {
          // After registration, get the session to set user
          const sessionResult = await getSessionAction()
          if (sessionResult.ok && sessionResult.user) {
            setUser(sessionResult.user)
            await Promise.all([
              refreshFinancial(),
              refreshInvestments(),
              refreshDeposits(),
              refreshWithdrawals(),
            ])
            router.push('/')
            return { ok: true }
          }
        }
        return { ok: false, error: result.error }
      } catch (error) {
        console.error('Registration error:', error)
        if (error instanceof Error) {
          return { ok: false, error: error.message }
        }
        return { ok: false, error: 'Registration failed' }
      }
    },
    [refreshFinancial, refreshInvestments, refreshDeposits, refreshWithdrawals, router],
  )

  const login = useCallback(
    async (phone: string, password: string): Promise<Result> => {
      try {
        const result = await loginAction({ phone, password })
        if (result.ok) {
          // After login, get the session to set user
          const sessionResult = await getSessionAction()
          if (sessionResult.ok && sessionResult.user) {
            setUser(sessionResult.user)
            await Promise.all([
              refreshFinancial(),
              refreshInvestments(),
              refreshDeposits(),
              refreshWithdrawals(),
            ])
            router.push('/')
            return { ok: true }
          }
        }
        return { ok: false, error: result.error }
      } catch (error) {
        console.error('Login error:', error)
        if (error instanceof Error) {
          return { ok: false, error: error.message }
        }
        return { ok: false, error: 'Login failed' }
      }
    },
    [refreshFinancial, refreshInvestments, refreshDeposits, refreshWithdrawals, router],
  )

  const logout = useCallback(async () => {
    try {
      await logoutAction()
      setUser(null)
      setInvestments([])
      setDeposits([])
      setWithdrawals([])
      setSummary({
        availableBalance: 0,
        totalInvested: 0,
        totalEarned: 0,
        todayEarnings: 0,
        pendingWithdrawals: 0,
      })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }, [router])

  const invest = useCallback(
    async (plan: Plan, amount: number): Promise<Result> => {
      if (!user) return { ok: false, error: 'You must be signed in' }

      try {
        const result = await investAction({
          planId: plan.id,
          planName: plan.name,
          amount,
          profitRate: plan.dailyProfitRate,
        })

        if (result.ok) {
          await Promise.all([
            refreshFinancial(),
            refreshInvestments(),
          ])
          return { ok: true }
        }
        return { ok: false, error: result.error }
      } catch (error) {
        console.error('Investment error:', error)
        if (error instanceof Error) {
          return { ok: false, error: error.message }
        }
        return { ok: false, error: 'Investment failed' }
      }
    },
    [user, refreshFinancial, refreshInvestments],
  )

  const requestWithdrawal = useCallback(
    async (telebirrPhoneRaw: string, amount: number): Promise<Result> => {
      if (!user) return { ok: false, error: 'You must be signed in' }

      try {
        const result = await requestWithdrawalAction({
          telebirrPhone: telebirrPhoneRaw,
          amount,
        })

        if (result.ok) {
          await Promise.all([
            refreshFinancial(),
            refreshWithdrawals(),
          ])
          return { ok: true }
        }
        return { ok: false, error: result.error }
      } catch (error) {
        console.error('Withdrawal error:', error)
        if (error instanceof Error) {
          return { ok: false, error: error.message }
        }
        return { ok: false, error: 'Withdrawal request failed' }
      }
    },
    [user, refreshFinancial, refreshWithdrawals],
  )

  const value: AppContextValue = {
    ready,
    user,
    investments,
    deposits,
    withdrawals,
    summary,
    register,
    login,
    logout,
    invest,
    requestWithdrawal,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
