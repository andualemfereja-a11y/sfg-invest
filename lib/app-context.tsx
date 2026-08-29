'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Deposit, Investment, Plan, User, Withdrawal } from './types'
import { store, generateId } from './storage'
import { recalcInvestment, computeInvestment, type InvestmentComputed } from './earnings'
import { normalizePhone } from './format'
import { MIN_WITHDRAWAL, RETURN_DAYS, MS_PER_DAY, WITHDRAWAL_PENDING_HOURS } from './plans'

export interface FinanceSummary {
  availableBalance: number
  totalInvested: number
  totalEarned: number
  todayEarnings: number
  pendingWithdrawals: number
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
  investments: InvestmentComputed[]
  deposits: Deposit[]
  withdrawals: Withdrawal[]
  summary: FinanceSummary
  register: (input: RegisterInput) => Result
  login: (phone: string, password: string) => Result
  logout: () => void
  invest: (plan: Plan, amount: number) => Result
  requestWithdrawal: (telebirrPhoneRaw: string, amount: number) => Result
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [investments, setInvestmentsState] = useState<Investment[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [now, setNow] = useState(() => Date.now())
  const bootstrapped = useRef(false)

  // Initial load from localStorage
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    setUsers(store.getUsers())
    setUserId(store.getSession())
    setInvestmentsState(store.getInvestments())
    setDeposits(store.getDeposits())
    setWithdrawals(store.getWithdrawals())
    setReady(true)
  }, [])

  // Recompute earnings + withdrawal status transitions on an interval.
  const reconcile = useCallback(() => {
    const t = Date.now()
    setNow(t)

    // Recalculate all investments idempotently and persist if changed.
    let invChanged = false
    const currentInv = store.getInvestments()
    const nextInv = currentInv.map((inv) => {
      const updated = recalcInvestment(inv, t)
      if (
        updated.accumulatedEarnings !== inv.accumulatedEarnings ||
        updated.status !== inv.status
      ) {
        invChanged = true
      }
      return updated
    })
    if (invChanged) {
      store.setInvestments(nextInv)
      setInvestmentsState(nextInv)
    }

    // Transition pending withdrawals to completed once the pending window elapses.
    let wChanged = false
    const currentW = store.getWithdrawals()
    const nextW = currentW.map((w) => {
      if (w.status === 'pending' && t >= w.pendingUntil) {
        wChanged = true
        return { ...w, status: 'completed' as const, completedAt: t }
      }
      return w
    })
    if (wChanged) {
      store.setWithdrawals(nextW)
      setWithdrawals(nextW)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    reconcile()
    const id = window.setInterval(reconcile, 15000)
    return () => window.clearInterval(id)
  }, [ready, reconcile])

  const user = useMemo(
    () => users.find((u) => u.id === userId) ?? null,
    [users, userId],
  )

  const userInvestments = useMemo(
    () => investments.filter((i) => i.userId === userId),
    [investments, userId],
  )

  const computedInvestments = useMemo<InvestmentComputed[]>(
    () =>
      userInvestments
        .map((i) => computeInvestment(i, now))
        .sort((a, b) => b.startTimestamp - a.startTimestamp),
    [userInvestments, now],
  )

  const userDeposits = useMemo(
    () =>
      deposits
        .filter((d) => d.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt),
    [deposits, userId],
  )

  const userWithdrawals = useMemo(
    () =>
      withdrawals
        .filter((w) => w.userId === userId)
        .sort((a, b) => b.requestedAt - a.requestedAt),
    [withdrawals, userId],
  )

  const summary = useMemo<FinanceSummary>(() => {
    const totalEarned = computedInvestments.reduce(
      (s, i) => s + i.accumulatedEarnings,
      0,
    )
    const totalInvested = computedInvestments
      .filter((i) => i.status === 'active')
      .reduce((s, i) => s + i.amount, 0)
    const todayEarnings = computedInvestments.reduce((s, i) => s + i.todayEarnings, 0)
    const pendingWithdrawals = userWithdrawals
      .filter((w) => w.status === 'pending')
      .reduce((s, w) => s + w.amount, 0)
    const base = user?.baseBalance ?? 0
    const availableBalance = Math.max(0, base + totalEarned)
    return {
      availableBalance,
      totalInvested,
      totalEarned,
      todayEarnings,
      pendingWithdrawals,
    }
  }, [computedInvestments, userWithdrawals, user])

  // ---- Actions ----

  const persistUsers = useCallback((next: User[]) => {
    store.setUsers(next)
    setUsers(next)
  }, [])

  const register = useCallback(
    (input: RegisterInput): Result => {
      const firstName = input.firstName.trim()
      const lastName = input.lastName.trim()
      if (!firstName) return { ok: false, error: 'First name is required.' }
      if (!lastName) return { ok: false, error: 'Last name is required.' }
      const phone = normalizePhone(input.phone)
      if (!phone)
        return { ok: false, error: 'Enter a valid Ethiopian phone number.' }
      if (!input.password) return { ok: false, error: 'Password is required.' }
      if (input.password.length < 6)
        return { ok: false, error: 'Password must be at least 6 characters.' }
      if (input.password !== input.confirmPassword)
        return { ok: false, error: 'Passwords do not match.' }
      const existing = store.getUsers()
      if (existing.some((u) => u.phone === phone))
        return { ok: false, error: 'This phone number is already registered.' }

      const newUser: User = {
        id: generateId('user'),
        firstName,
        lastName,
        phone,
        password: input.password,
        baseBalance: 0,
        createdAt: Date.now(),
      }
      const next = [...existing, newUser]
      persistUsers(next)
      store.setSession(newUser.id)
      setUserId(newUser.id)
      return { ok: true }
    },
    [persistUsers],
  )

  const login = useCallback((phoneRaw: string, password: string): Result => {
    const phone = normalizePhone(phoneRaw)
    if (!phone) return { ok: false, error: 'Enter a valid phone number.' }
    if (!password) return { ok: false, error: 'Password is required.' }
    const found = store.getUsers().find((u) => u.phone === phone)
    if (!found || found.password !== password)
      return { ok: false, error: 'Incorrect phone number or password.' }
    store.setSession(found.id)
    setUsers(store.getUsers())
    setUserId(found.id)
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    store.clearSession()
    setUserId(null)
  }, [])

  const invest = useCallback(
    (plan: Plan, amount: number): Result => {
      if (!userId || !user) return { ok: false, error: 'You must be signed in.' }
      if (!Number.isFinite(amount) || amount <= 0)
        return { ok: false, error: 'Enter a valid investment amount.' }
      if (amount < plan.minInvestment)
        return {
          ok: false,
          error: `Minimum investment for ${plan.name} is ${plan.minInvestment.toLocaleString('en-US')} ETB.`,
        }
      if (amount > summary.availableBalance)
        return { ok: false, error: 'Insufficient available balance.' }

      const start = Date.now()
      const dailyEarnings = amount * plan.dailyProfitRate
      const investment: Investment = {
        id: generateId('inv'),
        userId,
        planId: plan.id,
        planName: plan.name,
        amount,
        profitRate: plan.dailyProfitRate,
        returnDays: RETURN_DAYS,
        startTimestamp: start,
        endTimestamp: start + RETURN_DAYS * MS_PER_DAY,
        accumulatedEarnings: 0,
        lastCalculatedTimestamp: start,
        status: 'active',
      }
      const nextInv = [...store.getInvestments(), investment]
      store.setInvestments(nextInv)
      setInvestmentsState(nextInv)

      // Deduct principal from base balance.
      const nextUsers = store
        .getUsers()
        .map((u) => (u.id === userId ? { ...u, baseBalance: u.baseBalance - amount } : u))
      persistUsers(nextUsers)
      setNow(Date.now())
      void dailyEarnings
      return { ok: true }
    },
    [userId, user, summary.availableBalance, persistUsers],
  )

  const requestWithdrawal = useCallback(
    (telebirrPhoneRaw: string, amount: number): Result => {
      if (!userId || !user) return { ok: false, error: 'You must be signed in.' }
      const telebirrPhone = normalizePhone(telebirrPhoneRaw)
      if (!telebirrPhone)
        return { ok: false, error: 'Enter a valid Telebirr phone number.' }
      if (!Number.isFinite(amount) || amount <= 0)
        return { ok: false, error: 'Enter a valid withdrawal amount.' }
      if (amount < MIN_WITHDRAWAL)
        return { ok: false, error: `Minimum withdrawal amount is ${MIN_WITHDRAWAL} ETB.` }
      if (amount > summary.availableBalance)
        return { ok: false, error: 'Insufficient available balance.' }

      const requestedAt = Date.now()
      const withdrawal: Withdrawal = {
        id: generateId('wd'),
        userId,
        amount,
        method: 'telebirr',
        telebirrPhone,
        status: 'pending',
        requestedAt,
        pendingUntil: requestedAt + WITHDRAWAL_PENDING_HOURS * 60 * 60 * 1000,
        completedAt: null,
      }
      const nextW = [...store.getWithdrawals(), withdrawal]
      store.setWithdrawals(nextW)
      setWithdrawals(nextW)

      // Reserve/deduct amount from base balance.
      const nextUsers = store
        .getUsers()
        .map((u) => (u.id === userId ? { ...u, baseBalance: u.baseBalance - amount } : u))
      persistUsers(nextUsers)
      setNow(Date.now())
      return { ok: true }
    },
    [userId, user, summary.availableBalance, persistUsers],
  )

  const value: AppContextValue = {
    ready,
    user,
    investments: computedInvestments,
    deposits: userDeposits,
    withdrawals: userWithdrawals,
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
