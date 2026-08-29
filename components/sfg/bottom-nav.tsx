'use client'

import { Home, ShoppingBag, TrendingUp, User, type LucideIcon } from 'lucide-react'
import type { Screen } from '@/lib/types'
import { cn } from '@/lib/utils'

const TABS: { screen: Screen; label: string; icon: LucideIcon }[] = [
  { screen: 'home', label: 'Home', icon: Home },
  { screen: 'products', label: 'Product', icon: ShoppingBag },
  { screen: 'invest', label: 'Invest', icon: TrendingUp },
  { screen: 'mine', label: 'Mine', icon: User },
]

export function BottomNav({
  screen,
  onNavigate,
}: {
  screen: Screen
  onNavigate: (s: Screen) => void
}) {
  return (
    <nav className="sticky bottom-0 z-20 mt-auto grid grid-cols-4 border-t border-border bg-card/95 backdrop-blur">
      {TABS.map(({ screen: s, label, icon: Icon }) => {
        const active = screen === s
        return (
          <button
            key={s}
            type="button"
            onClick={() => onNavigate(s)}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center gap-1 py-2.5"
          >
            <span
              className={cn(
                'flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
            </span>
            <span
              className={cn(
                'text-[0.7rem] font-medium',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
