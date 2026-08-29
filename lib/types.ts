export interface User {
  id: string
  firstName: string
  lastName: string
  phone: string // normalized
  password: string // plain for localStorage prototype only
  baseBalance: number // ETB, adjusted by discrete events (deposits/investments/withdrawals)
  createdAt: number
}

export type InvestmentStatus = 'active' | 'completed'

export interface Investment {
  id: string
  userId: string
  planId: string
  planName: string
  amount: number
  profitRate: number // daily, decimal e.g. 0.042
  returnDays: number // 180
  startTimestamp: number
  endTimestamp: number
  accumulatedEarnings: number
  lastCalculatedTimestamp: number
  status: InvestmentStatus
}

export type DepositStatus = 'pending' | 'confirmed' | 'rejected'

export interface Deposit {
  id: string
  userId: string
  amount: number
  method: 'telebirr'
  status: DepositStatus
  createdAt: number
}

export type WithdrawalStatus = 'pending' | 'completed' | 'rejected'

export interface Withdrawal {
  id: string
  userId: string
  amount: number
  method: 'telebirr'
  telebirrPhone: string
  status: WithdrawalStatus
  requestedAt: number
  pendingUntil: number
  completedAt: number | null
}

export interface Plan {
  id: string
  name: string
  minInvestment: number
  dailyProfitRate: number // decimal
  returnDays: number
}

export type Screen = 'home' | 'products' | 'invest' | 'deposit' | 'withdraw' | 'mine'
