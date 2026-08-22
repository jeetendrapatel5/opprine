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
  text: z.string().min(5, 'Write at least 5 characters so the client has context.'),
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
            {/* Each update is a flex row: a small "rail" column (dot +
                the line segment under it) beside the content column
                (label, date, text card). The rail is a flex column too,
                so when the row stretches to match the content's height
                (flex's default align-items: stretch), the line — which
                is flex-1 — automatically grows to fill exactly that
                height. That's what makes the connector land precisely on
                the next dot every time, no matter how long or short each
                update's text is, and why it simply stops after the last
                dot instead of trailing off below it. */}
            <div className="flex flex-col">
              {project.updates.map((update, index) => {
                const style = getUpdateStatus(update.status)
                const isLast = index === project.updates.length - 1
                // Newest update (index 0) is the most relevant one, so its
                // dot glows a little brighter and the line fades slightly
                // with each step further into the past. The dot's actual
                // status color never fades — only this decorative glow —
                // so older entries stay just as readable.
                const emphasis = Math.max(0.4, 1 - index * 0.15)

                return (
                  <div key={update.id} className="flex gap-3 group">
                    <div className="flex flex-col items-center w-5 shrink-0">
                      <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                        <div
                          className={`absolute inset-0 m-auto w-4 h-4 rounded-full blur-[3px] ${style.dot}`}
                          style={{ opacity: 0.3 * emphasis }}
                          aria-hidden="true"
                        />
                        <div
                          className={`relative w-2.5 h-2.5 rounded-full ring-4 ring-fp-surface ${style.dot}`}
                          aria-hidden="true"
                        />
                      </div>
                      {!isLast && (
                        <div
                          className="w-px flex-1 mt-1 bg-fp-border"
                          style={{ opacity: emphasis }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className={`flex-1 min-w-0 ${isLast ? 'pb-1' : 'pb-6'}`}>
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
          className={`bg-fp-raised border rounded-xl p-4 transition-colors duration-150 ${errors.text
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
                const Icon = style.Icon
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