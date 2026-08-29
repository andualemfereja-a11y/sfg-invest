import { AppProvider } from '@/lib/app-context'
import { AppShell } from '@/components/sfg/app-shell'

export default function Page() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
