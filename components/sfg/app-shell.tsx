'use client'

import { useState } from 'react'
import type { Screen } from '@/lib/types'
import { useApp } from '@/lib/app-context'
import { AuthScreen } from './auth-screen'
import { Header } from './header'
import { BottomNav } from './bottom-nav'
import { HomeScreen } from './home-screen'
import { ProductsScreen } from './products-screen'
import { InvestScreen } from './invest-screen'
import { DepositScreen } from './deposit-screen'
import { WithdrawScreen } from './withdraw-screen'
import { MineScreen } from './mine-screen'

export function AppShell() {
  const { ready, user } = useApp()
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>()

  function navigate(next: Screen, planId?: string) {
    if (planId !== undefined) setSelectedPlanId(planId)
    setScreen(next)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center border-x border-border bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </main>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col border-x border-border bg-background shadow-xl">
      <Header screen={screen} />
      <main className="flex-1 pb-24">
        {screen === 'home' && <HomeScreen onNavigate={navigate} />}
        {screen === 'products' && <ProductsScreen onNavigate={navigate} />}
        {screen === 'invest' && (
          <InvestScreen selectedPlanId={selectedPlanId} onNavigate={navigate} />
        )}
        {screen === 'deposit' && <DepositScreen onNavigate={navigate} />}
        {screen === 'withdraw' && <WithdrawScreen onNavigate={navigate} />}
        {screen === 'mine' && <MineScreen onNavigate={navigate} />}
      </main>
      <BottomNav screen={screen} onNavigate={navigate} />
    </div>
  )
}
