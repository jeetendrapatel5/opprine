'use client'

import {
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useProjectPanel } from '@/hooks/use-project-panel'

export default function ProjectPanelNavItem({
  panelId,
  label,
  icon: Icon,
  activeClassName,
  inactiveClassName,
}) {
  const { isOpen, toggle } = useProjectPanel(panelId)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        onClick={toggle}
        isActive={isOpen}
        aria-pressed={isOpen}
        tooltip={label}
        className={isOpen ? activeClassName : inactiveClassName}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}