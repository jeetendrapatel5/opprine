'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from 'radix-ui'
import { Plus, X, Loader2 } from 'lucide-react'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']

const invoiceSchema = z.object({
  projectId: z.string().min(1, 'Select a project'),
  milestoneId: z.string().optional(),
  amount: z.coerce.number().positive('Enter an amount greater than 0'),
  currency: z.string().min(1),
  dueDate: z.string().optional(),
  note: z.string().max(500).optional(),
})

export default function NewInvoiceModal({ projects, nextNumber }) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { currency: 'USD' },
  })

  const selectedProjectId = watch('projectId')
  const milestones = useMemo(
    () => projects.find((p) => p.id === selectedProjectId)?.milestones ?? [],
    [projects, selectedProjectId]
  )

  async function onSubmit(values) {
    setServerError(null)
    try {
      // Expects POST /api/invoices — create the Invoice row, generate the
      // Stripe payment link server-side, and return the created record.
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Could not create the invoice. Try again.')
      }
      setOpen(false)
      reset()
      router.refresh()
    } catch (err) {
      setServerError(err.message)
    }
  }

  if (projects.length === 0) {
    return (
      <button
        disabled
        title="Create a project first"
        className="inline-flex items-center gap-1.5 bg-fp-surface text-fp-text-tertiary text-sm font-medium px-4 py-2 rounded-lg border border-fp-border cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        New Invoice
      </button>
    )
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          reset()
          setServerError(null)
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button className="inline-flex items-center gap-1.5 bg-fp-accent text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-fp-accent-hover transition-colors">
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-fp-base border border-fp-border rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-1">
            <Dialog.Title className="text-lg font-medium text-fp-text-primary">
              New Invoice
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="text-fp-text-tertiary hover:text-fp-text-primary transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-sm text-fp-text-secondary mb-6">
            Will be billed as <span className="font-mono text-fp-text-primary">{nextNumber}</span>.
          </Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-fp-text-secondary mb-1.5">
                Project
              </label>
              <select
                {...register('projectId')}
                defaultValue=""
                className="w-full bg-fp-surface border border-fp-border rounded-lg px-3 py-2 text-sm text-fp-text-primary focus:outline-none focus:ring-2 focus:ring-fp-accent/30"
              >
                <option value="" disabled>
                  Select a project
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <p className="text-fp-warning text-xs mt-1">{errors.projectId.message}</p>
              )}
            </div>

            {milestones.length > 0 && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-fp-text-secondary mb-1.5">
                  Milestone <span className="text-fp-text-tertiary font-normal">(optional)</span>
                </label>
                <select
                  {...register('milestoneId')}
                  defaultValue=""
                  className="w-full bg-fp-surface border border-fp-border rounded-lg px-3 py-2 text-sm text-fp-text-primary focus:outline-none focus:ring-2 focus:ring-fp-accent/30"
                >
                  <option value="">General invoice</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-fp-text-secondary mb-1.5">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('amount')}
                  className="w-full bg-fp-surface border border-fp-border rounded-lg px-3 py-2 text-sm font-mono text-fp-text-primary focus:outline-none focus:ring-2 focus:ring-fp-accent/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-fp-text-secondary mb-1.5">
                  Currency
                </label>
                <select
                  {...register('currency')}
                  className="bg-fp-surface border border-fp-border rounded-lg px-3 py-2 text-sm text-fp-text-primary focus:outline-none focus:ring-2 focus:ring-fp-accent/30"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {errors.amount && <p className="text-fp-warning text-xs">{errors.amount.message}</p>}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-fp-text-secondary mb-1.5">
                Due date <span className="text-fp-text-tertiary font-normal">(optional)</span>
              </label>
              <input
                type="date"
                {...register('dueDate')}
                className="w-full bg-fp-surface border border-fp-border rounded-lg px-3 py-2 text-sm text-fp-text-primary focus:outline-none focus:ring-2 focus:ring-fp-accent/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-fp-text-secondary mb-1.5">
                Note <span className="text-fp-text-tertiary font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="What this invoice is for…"
                {...register('note')}
                className="w-full bg-fp-surface border border-fp-border rounded-lg px-3 py-2 text-sm text-fp-text-primary focus:outline-none focus:ring-2 focus:ring-fp-accent/30 resize-none"
              />
            </div>

            {serverError && <p className="text-fp-warning text-sm">{serverError}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-fp-accent text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-fp-accent-hover transition-colors disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Creating…' : 'Create invoice'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
