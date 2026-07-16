'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Send, Clock, Loader2 } from 'lucide-react'
import { UPDATE_STATUS, getUpdateStatus } from './updateStatus'

const schema = z.object({
  text:   z.string().min(5, 'Write at least 5 characters so the client has context.'),
  status: z.enum(['IN_PROGRESS', 'IN_REVIEW', 'DONE']),
})

export default function UpdatesTab({ project }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const timelineRef = useRef(null) // scrollable timeline box — reset to top after a new post

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
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
      timelineRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      alert('Error saving update. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Cmd/Ctrl + Enter submits without leaving the keyboard — same shortcut
  // used by Slack, Linear, and most modern editors.
  const handleTextareaKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(onSubmit)()
    }
  }

  return (
    <div className="space-y-8">

      {/* Timeline */}
      <div>
        <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest mb-4">
          Timeline
        </p>

        {project.updates.length === 0 ? (
          <p className="text-fp-text-tertiary text-xs italic text-center py-4">
            No updates yet — post your first one below to keep the client in the loop.
          </p>
        ) : (
          // Outer box: owns the fixed height + the scrollbar. This is what
          // keeps the tab's height constant no matter how many updates
          // pile up over the life of the project.
          <div
            ref={timelineRef}
            className="max-h-[380px] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:var(--color-fp-border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-fp-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-fp-text-tertiary"
          >
            {/* Inner box: keeps its natural, un-clamped height. The
                connecting line is a `before:` pseudo-element stretched
                between this box's own top and bottom edges — if the
                height clamp lived here instead of on the outer box, the
                line would stop at the visible edge instead of running the
                full length of the list. */}
            <div className="relative space-y-6 before:absolute before:top-2 before:bottom-0 before:left-[5px] before:w-px before:bg-fp-border">
              {project.updates.map((update) => {
                const style = getUpdateStatus(update.status)
                const Icon  = style.Icon
                return (
                  <div key={update.id} className="relative pl-8 group">
                    <div
                      className={`absolute left-0 top-0.5 w-[11px] h-[11px] rounded-full z-10 ring-2 ring-fp-surface ${style.dot}`}
                      aria-hidden="true"
                    />
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${style.text}`}>
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
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest mb-2">
          Post an update
        </p>
        <div
          className={`bg-fp-raised border rounded-xl p-4 transition-colors duration-150 ${
            errors.text
              ? 'border-fp-danger/40'
              : 'border-fp-border focus-within:border-fp-accent/40 focus-within:ring-1 focus-within:ring-fp-accent/10'
          }`}
        >
          <textarea
            {...register('text')}
            onKeyDown={handleTextareaKeyDown}
            placeholder="What's the latest on this project?"
            className="w-full bg-transparent border-none outline-none resize-none text-fp-text-primary text-sm placeholder:text-fp-text-tertiary min-h-[64px] leading-relaxed"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-fp-border">
            <div className="flex gap-1.5">
              {Object.entries(UPDATE_STATUS).map(([key, style]) => {
                const Icon     = style.Icon
                const isActive = currentStatus === key
                return (
                  <label key={key} className="cursor-pointer">
                    {/* sr-only keeps this in the tab order and announced by
                        screen readers, unlike the old `hidden` class which
                        removed it from both. peer-focus-visible below gives
                        keyboard users a visible ring when they Tab to it. */}
                    <input
                      type="radio"
                      value={key}
                      {...register('status')}
                      className="sr-only peer"
                    />
                    <span
                      className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                        text-xs font-semibold transition-colors duration-150 cursor-pointer
                        peer-focus-visible:ring-2 peer-focus-visible:ring-fp-accent/50
                        ${isActive
                          ? `${style.bg} ${style.text}`
                          : 'text-fp-text-tertiary hover:text-fp-text-secondary hover:bg-fp-border/50'
                        }
                      `}
                    >
                      <Icon className="w-3 h-3" />
                      {style.label}
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="flex items-center gap-2.5">
              <span className="hidden sm:inline text-[10px] text-fp-text-tertiary">
                ⌘/Ctrl + Enter to post
              </span>
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
        </div>
        {errors.text && (
          <p className="text-[11px] text-fp-danger mt-1.5 pl-1">{errors.text.message}</p>
        )}
      </form>
    </div>
  )
}