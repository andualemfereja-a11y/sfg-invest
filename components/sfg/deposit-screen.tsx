'use client'

import { useState } from 'react'
import { Copy, Check, Send, ArrowLeft, CheckCircle2 } from 'lucide-react'
import type { Screen } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { TELEBIRR_ACCOUNT, TELEGRAM_HANDLE, TELEGRAM_URL } from '@/lib/plans'

export function DepositScreen({
  onNavigate,
}: {
  onNavigate: (s: Screen) => void
}) {
  const [copied, setCopied] = useState(false)

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(TELEBIRR_ACCOUNT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <div>
        <h2 className="text-xl font-bold text-foreground">Deposit via Telebirr</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Send your deposit to the Telebirr account below, then confirm your payment on
          Telegram to have your balance credited.
        </p>
      </div>

      {/* Telebirr account card */}
      <div className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-sm">
        <p className="text-sm font-medium opacity-80">Telebirr Account Number</p>
        <p className="mt-2 text-3xl font-extrabold tracking-wide tabular-nums">
          {TELEBIRR_ACCOUNT}
        </p>
        <button
          type="button"
          onClick={copyAccount}
          className="mt-4 flex items-center gap-2 rounded-xl bg-primary-foreground/15 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-primary-foreground/25"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copied!' : 'Copy Number'}
        </button>
      </div>

      {/* Steps */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">How to deposit</h3>
        <ol className="mt-4 flex flex-col gap-4">
          <Step n={1} text={`Open Telebirr and send your desired amount to ${TELEBIRR_ACCOUNT}.`} />
          <Step n={2} text="Take a screenshot of your payment confirmation." />
          <Step
            n={3}
            text={`Send the screenshot to ${TELEGRAM_HANDLE} on Telegram with your registered phone number.`}
          />
          <Step n={4} text="Your balance will be credited after confirmation." />
        </ol>
      </div>

      {/* Telegram CTA */}
      <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="block">
        <Button className="h-12 w-full rounded-xl text-base font-semibold">
          <Send className="size-4" />
          Confirm on Telegram ({TELEGRAM_HANDLE})
        </Button>
      </a>

      <div className="flex items-start gap-2 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm text-foreground">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
        <p className="text-pretty">
          Deposits are processed manually and are usually credited within minutes after
          your payment is confirmed on Telegram.
        </p>
      </div>
    </div>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <span className="text-sm text-foreground text-pretty">{text}</span>
    </li>
  )
}
