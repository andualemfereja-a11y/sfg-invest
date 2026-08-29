import type { Plan } from './types'

export const RETURN_DAYS = 180
export const MIN_WITHDRAWAL = 350
export const WITHDRAWAL_PENDING_HOURS = 12
export const MS_PER_DAY = 24 * 60 * 60 * 1000

export const TELEBIRR_ACCOUNT = '0980404268'
export const TELEGRAM_HANDLE = '@lisasfgm'
export const TELEGRAM_URL = 'https://t.me/lisasfgm'

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'SFG Starter',
    minInvestment: 5800,
    dailyProfitRate: 0.042,
    returnDays: RETURN_DAYS,
  },
  {
    id: 'growth',
    name: 'SFG Growth',
    minInvestment: 12500,
    dailyProfitRate: 0.045,
    returnDays: RETURN_DAYS,
  },
  {
    id: 'premium',
    name: 'SFG Premium',
    minInvestment: 25000,
    dailyProfitRate: 0.048,
    returnDays: RETURN_DAYS,
  },
  {
    id: 'pro',
    name: 'SFG Pro',
    minInvestment: 50000,
    dailyProfitRate: 0.05,
    returnDays: RETURN_DAYS,
  },
]
