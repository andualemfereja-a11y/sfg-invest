'use client'

import { TrendingUp } from 'lucide-react'
import type { Screen } from '@/lib/types'

const TITLES: Record<Screen, string> = {
  home: 'Home',
  products: 'Products',
  invest: 'Investments',
  deposit: 'Deposit',
  withdraw: 'Withdraw',
  mine: 'My Account',
}

export function Header({ screen }: { screen: Screen }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/95 px-5 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <TrendingUp className="size-4.5" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-extrabold tracking-tight text-foreground">SFG</span>
      </div>
      <h1 className="text-sm font-semibold text-muted-foreground">{TITLES[screen]}</h1>
    </header>
  )
}
