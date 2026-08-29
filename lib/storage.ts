import type { Deposit, Investment, User, Withdrawal } from './types'

const KEYS = {
  users: 'sfg_users',
  session: 'sfg_currentSession',
  investments: 'sfg_investments',
  deposits: 'sfg_deposits',
  withdrawals: 'sfg_withdrawals',
} as const

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota errors in prototype */
  }
}

export const store = {
  getUsers: () => read<User[]>(KEYS.users, []),
  setUsers: (users: User[]) => write(KEYS.users, users),

  getSession: () => read<string | null>(KEYS.session, null),
  setSession: (userId: string | null) => write(KEYS.session, userId),
  clearSession: () => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(KEYS.session)
  },

  getInvestments: () => read<Investment[]>(KEYS.investments, []),
  setInvestments: (items: Investment[]) => write(KEYS.investments, items),

  getDeposits: () => read<Deposit[]>(KEYS.deposits, []),
  setDeposits: (items: Deposit[]) => write(KEYS.deposits, items),

  getWithdrawals: () => read<Withdrawal[]>(KEYS.withdrawals, []),
  setWithdrawals: (items: Withdrawal[]) => write(KEYS.withdrawals, items),
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}
