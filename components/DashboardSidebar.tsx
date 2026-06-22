"use client"

// ─── Why "use client"? ────────────────────────────────────────────────────
// This component uses:
//   - usePathname()  → reads the current URL (browser-only API)
//   - signOut()      → triggers a client-side NextAuth action
//   - The shadcn sidebar hooks (useSidebar) live in a client context too
// Server components can't use any of these, so this must be a client component.
// ─────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Receipt,
  Settings,
  LogOut,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard',           icon: LayoutDashboard },
  { label: 'Projects',  href: '/dashboard/projects',  icon: FolderKanban    },
  { label: 'Clients',   href: '/dashboard/clients',   icon: Users           },
  { label: 'Invoices',  href: '/dashboard/invoices',  icon: Receipt         },
]

const BOTTOM_ITEMS = [
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

type Props = {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export default function DashboardSidebar({ user }: Props) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  const navButtonClass = (active: boolean) =>
    active
      ? 'bg-[var(--color-fp-accent)]/10 text-[var(--color-fp-accent)] hover:bg-[var(--color-fp-accent)]/15 hover:text-[var(--color-fp-accent)]'
      : 'text-[var(--color-fp-text-secondary)] hover:text-[var(--color-fp-text-primary)] hover:bg-[var(--color-fp-surface-2,var(--color-fp-surface))]'

  return (
    <Sidebar collapsible="icon" className="border-[var(--color-fp-border)]">

      <SidebarHeader className="border-b border-[var(--color-fp-border)] justify-center h-14">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5"
        >

          <div className="w-7 h-7 rounded-lg bg-[var(--color-fp-accent)] flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-black leading-none">OP</span>
          </div>

          <span className="font-semibold text-sm tracking-tight text-[var(--color-fp-text-primary)] group-data-[collapsible=icon]:hidden">
            Opprine
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(href)}
                    tooltip={label}
                    className={navButtonClass(isActive(href))}
                  >
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--color-fp-border)] py-2 px-2">

        {/* Settings link */}
        <SidebarMenu>
          {BOTTOM_ITEMS.map(({ label, href, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(href)}
                tooltip={label}
                className={navButtonClass(isActive(href))}
              >
                <Link href={href}>
                  <Icon />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarSeparator className="my-1 bg-[var(--color-fp-border)]" />

        <div className="flex items-center gap-2.5 px-2 py-1.5">

          <div className="w-7 h-7 rounded-full bg-[var(--color-fp-accent)]/15 border border-[var(--color-fp-accent)]/30 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-semibold text-[var(--color-fp-accent)] leading-none">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>

          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-medium text-[var(--color-fp-text-primary)] truncate leading-tight">
              {user?.name ?? 'Freelancer'}
            </p>
            <p className="text-[10px] text-[var(--color-fp-text-tertiary)] truncate leading-tight mt-0.5">
              {user?.email ?? ''}
            </p>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/signin' })}
            title="Sign out"
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md
                       text-[var(--color-fp-text-tertiary)] hover:text-[var(--color-fp-text-primary)]
                       hover:bg-[var(--color-fp-surface-2,var(--color-fp-surface))]
                       transition-colors group-data-[collapsible=icon]:hidden"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

      </SidebarFooter>

      <SidebarRail />

    </Sidebar>
  )
}