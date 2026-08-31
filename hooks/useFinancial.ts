// hooks/useFinancial.ts
'use client'

import { useAuth } from './useAuth'

export function useFinancial() {
  const { financial, refreshFinancial, loading } = useAuth()

  return {
    financial,
    refreshFinancial,
    loading,
    availableBalance: financial?.availableBalance ?? 0,
    totalInvested: financial?.totalInvested ?? 0,
    totalEarned: financial?.totalEarned ?? 0,
    todayEarnings: financial?.todayEarnings ?? 0,
    pendingWithdrawals: financial?.pendingWithdrawals ?? 0,
  }
}
