'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useProjectPanel } from '@/hooks/use-project-panel'
import { cn } from '@/lib/utils'

export default function ProjectPanelDialog({
  panelId,
  title,
  description,
  children,
  bare = false,
  className,
}) {
  const { isOpen, close } = useProjectPanel(panelId)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent
        className={cn(bare && 'bg-transparent border-none shadow-none p-0', className)}
      >
        {/* Radix requires an accessible title/description on every dialog.
            When the content renders its own visible heading (the `bare`
            case), these stay screen-reader-only so we don't show it twice. */}
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {bare ? children : <div className="p-4">{children}</div>}
      </DialogContent>
    </Dialog>
  )
}