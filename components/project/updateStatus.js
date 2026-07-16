// components/project/updateStatus.js
//
// Single source of truth for how an Update's `status` value is labeled,
// colored, and iconified. Both UpdatesTab (the composer + full timeline)
// and RecentActivityPanel (the quick-glance dialog) import this, so an
// "In Review" update looks identical everywhere it appears — one map to
// edit if you ever add a status or change a color.

import { RefreshCcw, Eye, CheckCircle2 } from 'lucide-react'

export const UPDATE_STATUS = {
  IN_PROGRESS: {
    label: 'In Progress',
    Icon: RefreshCcw,
    text: 'text-fp-accent',
    bg: 'bg-fp-accent-muted',
    dot: 'bg-fp-accent',
  },
  IN_REVIEW: {
    label: 'In Review',
    Icon: Eye,
    text: 'text-fp-warning',
    bg: 'bg-fp-warning/10',
    dot: 'bg-fp-warning',
  },
  DONE: {
    label: 'Completed',
    Icon: CheckCircle2,
    text: 'text-fp-success',
    bg: 'bg-fp-success/10',
    dot: 'bg-fp-success',
  },
}

// Falls back to IN_PROGRESS if a status is missing or unrecognized, so a
// bad/old value in the database never renders a blank, unstyled pill.
export function getUpdateStatus(status) {
  return UPDATE_STATUS[status] ?? UPDATE_STATUS.IN_PROGRESS
}