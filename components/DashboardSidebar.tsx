"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Receipt,
  Settings,
  User,
  Landmark,
  LogOut,
  CreditCard,
  UserRoundPlus
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
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ProjectPanelNavItem from '@/components/dashboard/ProjectPanelNavItem'
import { visibleProjectPanels } from '@/lib/project-panels'
import WorkspaceSwitcher from '@/components/dashboard/WorkspaceSwitcher'

// Minimal shape of what getEntitlements() returns — just enough for the
// filtering this file does. lib/project-panels.js stays plain JS (used by
// .jsx files too), so this type lives here rather than being imported
// from there.
type Entitlements = {
  features?: Record<string, boolean>
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
  { label: 'Clients', href: '/dashboard/clients', icon: Users },
  { label: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
  { label: 'Team', href: '/dashboard/team', icon: UserRoundPlus },
]

const SETTINGS_ITEMS = [
  { label: 'Profile', href: '/dashboard/settings?section=profile', icon: User },
  { label: 'Bank Account', href: '/dashboard/settings?section=bank', icon: Landmark },
  { label: 'Plans', href: '/dashboard/settings/billing', icon: CreditCard },
]

// Matches /dashboard/projects/:id exactly — NOT /dashboard/projects (the
// list page) and NOT nested routes like /dashboard/projects/:id/story.
// PROJECT_PANELS buttons only make sense on the project detail page itself.
const PROJECT_DETAIL_PATTERN = /^\/dashboard\/projects\/[^/]+\/?$/

type Props = {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export default function DashboardSidebar({ user }: Props) {
  const pathname = usePathname()

  // Start with only the panels that need no feature flag — the safe,
  // restrictive default. This is deliberate: if we started with the
  // FULL list and narrowed it once entitlements arrive, a Free-plan
  // user would see the GitHub tab flash on screen, then vanish. Starting
  // narrow means gated panels can only ever APPEAR as data loads in,
  // never appear-then-disappear.
  const [visiblePanels, setVisiblePanels] = useState(() => visibleProjectPanels(undefined))

  useEffect(() => {
    fetch('/api/workspace')
      .then((res) => res.json())
      .then((data: { entitlements?: Entitlements }) => {
        setVisiblePanels(visibleProjectPanels(data.entitlements))
      })
      .catch(() => {
        // Network hiccup — stay on the safe default list rather than
        // risk showing a gated panel by accident.
      })
  }, [])

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  const navButtonClass = (active: boolean) =>
    active
      ? 'bg-[var(--color-fp-accent)]/10 text-[var(--color-fp-accent)] hover:bg-[var(--color-fp-accent)]/15 hover:text-[var(--color-fp-accent)]'
      : 'text-[var(--color-fp-text-secondary)] hover:text-[var(--color-fp-text-primary)] hover:bg-[var(--color-fp-surface-2,var(--color-fp-surface))]'

  const isProjectDetailRoute = PROJECT_DETAIL_PATTERN.test(pathname ?? '')

  return (
    <Sidebar collapsible="icon" className="border-[var(--color-fp-border)]">

      <SidebarHeader className="justify-center h-14">
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
        {/* Workspace context sits ABOVE page navigation on purpose —
            switching it changes what every link below even points at,
            so it needs to read as the higher-level control. Hidden in
            icon-collapsed mode (group-data-[collapsible=icon]:hidden),
            same convention this file already uses for the user
            name/email in the footer — a dropdown with visible text
            doesn't have a sensible icon-only form, so it just disappears
            rather than rendering broken. */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <WorkspaceSwitcher />
          </SidebarGroupContent>
        </SidebarGroup>

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

              <div className="mt-7">
                {isProjectDetailRoute &&
                  visiblePanels.map(({ id, label, icon }) => (
                    <ProjectPanelNavItem
                      key={id}
                      panelId={id}
                      label={label}
                      icon={icon}
                      activeClassName={navButtonClass(true)}
                      inactiveClassName={navButtonClass(false)}
                    />
                  ))}
              </div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="py-2 px-2">

        {/* Settings dropdown */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  isActive={isActive('/dashboard/settings')}
                  tooltip="Setting"
                  className={navButtonClass(isActive('/dashboard/settings'))}
                >
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" sideOffset={8} className="min-w-40 bg-fp-base ml-1">
                {SETTINGS_ITEMS.map(({ label, href, icon: Icon }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link href={href} className="cursor-pointer text-white">
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex items-center gap-2.5 py-1.5">

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