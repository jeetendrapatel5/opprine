import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import DashboardSidebar from '@/components/DashboardSidebar'
import NotificationBell from '@/components/notifications/NotificationBell'
import QueryProvider from '@/components/QueryProvider'
import { getWorkspaceForUser } from '@/lib/workspace'

export default async function DashboardLayout({ children }) {

  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  // Which workspace is active for this user RIGHT NOW (read from the DB, and
  // validated against a real WorkspaceMember row inside getWorkspaceForUser).
  // QueryProvider uses it as part of the cache scope: when the user or the
  // workspace changes, the page content's in-browser cache is thrown away and
  // rebuilt. getWorkspaceForUser returns null when the user has no workspace,
  // so we do not throw here; 'none' is just a placeholder scope.
  const membership = await getWorkspaceForUser(session.user.id)
  const workspaceId = membership?.workspaceId ?? 'none'

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

          {/* ml-auto pushes the bell to the far right of the header.
              SidebarTrigger stays left; nothing sits between them yet
              (e.g. breadcrumbs) — if you add something there later, it
              goes between this div and SidebarTrigger, not inside it. */}
          <div className="ml-auto flex items-center">
            <NotificationBell />
          </div>

        </header>
        {/* QueryProvider wraps ONLY the page content, not the sidebar or the
            header. When the workspace changes, just the page content is rebuilt
            with an empty cache; the sidebar (and its workspace switcher) keeps
            its state and does not flicker. If the sidebar or the bell ever
            need the shared cache, move the provider up to wrap them too. */}
        <main className="w-full px-4 sm:px-6 py-8">
          <QueryProvider userId={session.user.id} workspaceId={workspaceId}>
            {children}
          </QueryProvider>
        </main>

      </SidebarInset>

    </SidebarProvider>
  )
}