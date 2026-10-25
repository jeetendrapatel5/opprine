'use client'

// components/project/PanelTrigger.jsx
//
// A button that opens the <ProjectPanelDialog> with the same panelId.
//
// This is the ONLY client-side piece of the redesigned sidebar. Opening a
// dialog needs the useProjectPanel hook, and hooks only run in the browser.
// Everything around it (cards, rows, numbers) stays a server component. The
// server renders the button's contents and passes them in as `children`.

import { useProjectPanel } from '@/hooks/use-project-panel'

export default function PanelTrigger({ panelId, className, children }) {
  const { open } = useProjectPanel(panelId)

  return (
    // Arrow function on purpose: it calls open() with no arguments, instead of
    // handing the click event to the hook as if it were an argument.
    <button type="button" aria-haspopup="dialog" onClick={() => open()} className={className}>
      {children}
    </button>
  )
}