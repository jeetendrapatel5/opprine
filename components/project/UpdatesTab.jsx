// components/project/UpdatesTab.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Project-level update log. The freelancer posts text updates with a status
// (IN_PROGRESS, IN_REVIEW, DONE) that appear in a chronological feed.
//
// Note: This is the LEGACY update system (the Update model), separate from
// MilestoneUpdate which lives inside each milestone. Both exist in the product.
//
// Design: The timeline uses a vertical line (::before pseudo-element via
// a positioned div) with status-colored circle markers. The status radio
// buttons are styled as pill toggles — not native radio UI which looks cheap.
//
// The textarea focuses to bg-fp-raised — inputs "open up" when focused,
// signaling "I'm ready for your input".
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Send, Clock, CheckCircle2, RefreshCcw, Eye, Loader2 } from 'lucide-react'

const schema = z.object({
  text:   z.string().min(5, 'Update must be at least 5 characters'),
  status: z.enum(['IN_PROGRESS', 'IN_REVIEW', 'DONE']),
})

// Status config mapped to fp tokens
// Each status gets: a bg tint, text color, and the icon component
const statusStyles = {
  IN_PROGRESS: {
    label:       'In Progress',
    Icon:        RefreshCcw,
    // Active pill colors (when this status is selected in the form)
    activePill:  'bg-fp-accent-muted text-fp-accent',
    // Feed entry colors (for displaying past updates in the timeline)
    feedBg:      'bg-fp-accent-muted',
    feedText:    'text-fp-accent',
    feedDot:     'bg-fp-accent',
  },
  IN_REVIEW: {
    label:       'In Review',
    Icon:        Eye,
    activePill:  'bg-fp-warning/10 text-fp-warning',
    feedBg:      'bg-fp-warning/10',
    feedText:    'text-fp-warning',
    feedDot:     'bg-fp-warning',
  },
  DONE: {
    label:       'Completed',
    Icon:        CheckCircle2,
    activePill:  'bg-fp-success/10 text-fp-success',
    feedBg:      'bg-fp-success/10',
    feedText:    'text-fp-success',
    feedDot:     'bg-fp-success',
  },
}

export default function UpdatesTab({ project }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, reset, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'IN_PROGRESS' },
  })

  const currentStatus = watch('status')

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      await axios.post(`/api/projects/${project.id}/updates`, data)
      reset()
      // router.refresh() re-runs the Server Component data fetch so the
      // new update appears in the list without a full page reload.
      router.refresh()
    } catch {
      alert('Error saving update. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">

      {/* ── Post update form ── */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="
          bg-fp-raised border border-fp-border rounded-xl p-4
          transition-colors duration-150
          focus-within:border-fp-accent/30 focus-within:ring-2 focus-within:ring-fp-accent/10
        ">
          <textarea
            {...register('text')}
            placeholder="What's the latest on this project?"
            className="
              w-full bg-transparent border-none outline-none resize-none
              text-fp-text-primary text-sm placeholder:text-fp-text-tertiary
              min-h-[72px] leading-relaxed
            "
          />

          {/* Bottom bar: status pills + submit */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-fp-border">

            {/* Status radio pills — styled as a toggle group */}
            <div className="flex gap-1.5">
              {Object.entries(statusStyles).map(([key, style]) => {
                const Icon     = style.Icon
                const isActive = currentStatus === key
                return (
                  <label key={key} className="cursor-pointer">
                    {/* Hidden native radio — we style the label instead */}
                    <input
                      type="radio"
                      value={key}
                      {...register('status')}
                      className="hidden"
                    />
                    <span className={`
                      inline-flex items-center gap-1.5
                      px-2.5 py-1 rounded-lg text-xs font-semibold
                      transition-colors duration-150 cursor-pointer
                      ${isActive
                        ? style.activePill
                        : 'text-fp-text-tertiary hover:text-fp-text-secondary hover:bg-fp-border/50'
                      }
                    `}>
                      <Icon className="w-3 h-3" />
                      {style.label}
                    </span>
                  </label>
                )
              })}
            </div>

            {/* Post button — primary spec */}
            <button
              type="submit"
              disabled={isLoading}
              className="
                flex items-center gap-1.5
                bg-fp-accent hover:bg-fp-accent-hover text-fp-base
                text-xs font-bold px-3 py-1.5 rounded-lg
                transition-colors duration-150 disabled:opacity-50
              "
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send    className="w-3.5 h-3.5" />
              }
              {isLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </form>

      {/* ── Update feed ── */}
      {project.updates.length === 0 ? (
        <p className="text-fp-text-tertiary text-xs italic text-center py-4">
          No project updates yet.
        </p>
      ) : (
        // Timeline — the vertical line is the left edge of the dot column
        <div className="relative space-y-6 before:absolute before:top-0 before:bottom-0 before:left-[7px] before:w-px before:bg-fp-border">
          {project.updates.map((update) => {
            const style = statusStyles[update.status] ?? statusStyles.IN_PROGRESS
            const Icon  = style.Icon
            return (
              <div key={update.id} className="relative pl-8 group">

                {/* Timeline dot — colored circle that sits on the vertical line */}
                {/* z-10 ensures it renders above the line, not behind it */}
                <div className={`
                  absolute left-0 top-0.5 w-4 h-4 rounded-full z-10
                  flex items-center justify-center shrink-0
                  ${style.feedBg}
                `}>
                  <Icon className={`w-2.5 h-2.5 ${style.feedText}`} />
                </div>

                {/* Update content */}
                <div className="flex items-start gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${style.feedText}`}>
                    {style.label}
                  </span>
                  <span className="text-[10px] text-fp-text-tertiary flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(update.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short',
                    })}
                  </span>
                </div>

                <p className="
                  text-sm text-fp-text-secondary leading-relaxed
                  bg-fp-raised border border-fp-border rounded-lg p-3
                  group-hover:border-fp-accent/20 transition-colors duration-150
                ">
                  {update.text}
                </p>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}