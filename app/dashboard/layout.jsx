import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import DashboardSidebar from '@/components/DashboardSidebar'

export default async function DashboardLayout({ children }) {

  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  return (
    <SidebarProvider
      defaultOpen={false}
      style={{
        '--sidebar': 'var(--color-fp-base)',
        '--sidebar-foreground': 'var(--color-fp-text-primary)',
        '--sidebar-accent': 'var(--color-fp-accent-muted)',
        '--sidebar-accent-foreground': 'var(--color-fp-text-primary)',
        '--sidebar-border': 'transparent',
        '--sidebar-ring': 'var(--color-fp-accent)',
        '--sidebar-primary': 'var(--color-fp-accent)',
        '--sidebar-primary-foreground': '#000000',
      }}
    >

      <DashboardSidebar user={session.user} />
      <SidebarInset className="bg-fp-base min-h-screen font-body">

        <header className="
          sticky top-0 z-9
          flex items-center gap-3
          h-14 px-4 sm:px-6
          border-b border-fp-border
          bg-fp-base
        ">

          <SidebarTrigger
            className="text-fp-text-secondary hover:text-fp-text-primary hover:bg-fp-surface transition-colors"
          />

        </header>
        <main className="w-full px-4 sm:px-6 py-8">
          {children}
        </main>

      </SidebarInset>

    </SidebarProvider>
  )
}