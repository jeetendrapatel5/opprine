'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Send, Loader2 } from 'lucide-react'
import { UPDATE_STATUS } from './updateStatus'

const schema = z.object({
  text: z.string().min(5, 'Write at least 5 characters so the client has context.'),
  status: z.enum(['IN_PROGRESS', 'IN_REVIEW', 'DONE']),
})

function StatusOption({ value, style, isActive, register }) {
  const Icon = style.Icon
  return (
    <label className="cursor-pointer">
      <input type="radio" value={value} {...register('status')} className="peer sr-only" />
      <span
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-fp-accent/50 ${
          isActive
            ? `${style.bg} ${style.text}`
            : 'text-fp-text-tertiary hover:bg-fp-border/50 hover:text-fp-text-secondary'
        }`}
      >
        <Icon className="h-3 w-3" aria-hidden="true" />
        {style.label}
      </span>
    </label>
  )
}

export default function UpdateComposer({ projectId, onPosted }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { text: '', status: 'IN_PROGRESS' },
  })

  const currentStatus = useWatch({ control, name: 'status' })

  const onSubmit = async (data) => {
    setIsLoading(true)
    setSubmitError('')
    try {
      await axios.post('/api/updates', { ...data, projectId })
      reset()
      router.refresh()
      onPosted?.()
    } catch {
      setSubmitError('Could not save the update. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(onSubmit)()
    }
  }

  const errorMessage = errors.text?.message || submitError

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label htmlFor="update-text" className="sr-only">
        Post an update
      </label>
      <div
        className={`rounded-lg border bg-fp-base/40 transition-colors duration-150 ${
          errorMessage
            ? 'border-fp-danger/40'
            : 'border-fp-border focus-within:border-fp-accent/40 focus-within:ring-1 focus-within:ring-fp-accent/10'
        }`}
      >
        <textarea
          id="update-text"
          {...register('text')}
          onKeyDown={handleKeyDown}
          rows={3}
          aria-invalid={Boolean(errors.text)}
          placeholder="What's the latest on this project?"
          className="block min-h-[84px] w-full resize-y bg-transparent px-3.5 pt-3 text-sm leading-relaxed text-fp-text-primary outline-none placeholder:text-fp-text-tertiary"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-2">
          <div role="radiogroup" aria-label="Update status" className="flex flex-wrap gap-1">
            {Object.entries(UPDATE_STATUS).map(([key, style]) => (
              <StatusOption
                key={key}
                value={key}
                style={style}
                isActive={currentStatus === key}
                register={register}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] text-fp-text-tertiary sm:inline">⌘/Ctrl + Enter</span>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-md bg-fp-accent px-3 py-1.5 text-xs font-semibold text-fp-base transition-colors duration-150 hover:bg-fp-accent-hover disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {isLoading ? 'Posting…' : 'Post update'}
            </button>
          </div>
        </div>
      </div>
      {errorMessage && (
        <p role="alert" className="mt-1.5 pl-1 text-[11px] text-fp-danger">
          {errorMessage}
        </p>
      )}
    </form>
  )
}