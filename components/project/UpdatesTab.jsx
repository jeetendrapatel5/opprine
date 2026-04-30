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

const statusStyles = {
  IN_PROGRESS: {
    label:      'In Progress',
    Icon:       RefreshCcw,
    activePill: 'bg-fp-accent-muted text-fp-accent',
    feedBg:     'bg-fp-accent-muted',
    feedText:   'text-fp-accent',
    feedDot:    'bg-fp-accent',
  },
  IN_REVIEW: {
    label:      'In Review',
    Icon:       Eye,
    activePill: 'bg-fp-warning/10 text-fp-warning',
    feedBg:     'bg-fp-warning/10',
    feedText:   'text-fp-warning',
    feedDot:    'bg-fp-warning',
  },
  DONE: {
    label:      'Completed',
    Icon:       CheckCircle2,
    activePill: 'bg-fp-success/10 text-fp-success',
    feedBg:     'bg-fp-success/10',
    feedText:   'text-fp-success',
    feedDot:    'bg-fp-success',
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
      await axios.post('/api/updates', { ...data, projectId: project.id })
      reset()
      router.refresh()
    } catch {
      alert('Error saving update. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">

      {/* Post update form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-fp-raised border border-fp-border rounded-xl p-4 transition-colors duration-150 focus-within:border-fp-accent/40 focus-within:ring-1 focus-within:ring-fp-accent/10">
          <textarea
            {...register('text')}
            placeholder="What's the latest on this project?"
            className="w-full bg-transparent border-none outline-none resize-none text-fp-text-primary text-sm placeholder:text-fp-text-tertiary min-h-[64px] leading-relaxed"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-fp-border">
            <div className="flex gap-1.5">
              {Object.entries(statusStyles).map(([key, style]) => {
                const Icon     = style.Icon
                const isActive = currentStatus === key
                return (
                  <label key={key} className="cursor-pointer">
                    <input type="radio" value={key} {...register('status')} className="hidden" />
                    <span className={`
                      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                      text-xs font-semibold transition-colors duration-150 cursor-pointer
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
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 bg-fp-accent hover:bg-fp-accent-hover text-fp-base text-xs font-bold px-3 py-1.5 rounded-lg transition-colors duration-150 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {isLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </form>

      {/* Update feed */}
      {project.updates.length === 0 ? (
        <p className="text-fp-text-tertiary text-xs italic text-center py-4">
          No project updates yet.
        </p>
      ) : (
        // before:left-[5px] aligns the line through the center of the 16px dot
        <div className="relative space-y-6 before:absolute before:top-2 before:bottom-0 before:left-[5px] before:w-px before:bg-fp-border">
          {project.updates.map((update) => {
            const style = statusStyles[update.status] ?? statusStyles.IN_PROGRESS
            const Icon  = style.Icon
            return (
              <div key={update.id} className="relative pl-8 group">
                <div className={`absolute left-0 top-0.5 w-[11px] h-[11px] rounded-full z-10 flex items-center justify-center shrink-0 ring-2 ring-fp-surface ${style.feedDot}`}>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${style.feedText}`}>
                    {style.label}
                  </span>
                  <span className="text-[10px] text-fp-text-tertiary flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(update.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-sm text-fp-text-secondary leading-relaxed bg-fp-raised border border-fp-border rounded-lg p-3 group-hover:border-fp-accent/20 transition-colors duration-150">
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