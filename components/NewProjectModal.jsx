// components/NewProjectModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Client Component — manages local form state, calls POST /api/projects.
//
// Design decisions:
// - The trigger button is our "primary button" spec: bg-fp-accent, white text,
//   rounded-lg, DM Sans 14px weight 500. Used consistently everywhere.
// - The modal uses bg-fp-raised — one level above fp-surface — so it appears
//   to float above the page. No drop-shadow needed because the background
//   dimming (bg-black/60) provides the depth.
// - The overlay is bg-black/60 with backdrop-blur-sm — the blur softens the
//   background, keeping the freelancer aware of context without distraction.
// - Input fields use bg-fp-base (the page base color) — inputs should visually
//   "recede" below the surface, signaling "fill me in". Surface-colored inputs
//   blend into the card and lose their affordance.
// - The form is split into two logical sections with a divider: Project Details
//   and Client Details. This reduces cognitive load by grouping related fields.
// - z-index: modal at z-50, overlay at z-40 (modal must be above overlay).
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { X, Plus, Loader2 } from 'lucide-react'

// Zod schema — validation rules for each field.
// z.string().min() gives us a clear error message for the freelancer.
const schema = z.object({
  name:        z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  clientName:  z.string().min(2, 'Client name must be at least 2 characters'),
  clientEmail: z.string().email('Please enter a valid email'),
})

export default function NewProjectModal({ userId }) {
  const [isOpen,     setIsOpen]     = useState(false)
  const [isLoading,  setIsLoading]  = useState(false)
  const [error,      setError]      = useState('')
  const router = useRouter()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    setError('')
    try {
      await axios.post('/api/projects', { ...data, userId })
      setIsOpen(false)
      reset()
      // router.refresh() tells Next.js to re-run the Server Component data fetch,
      // so the new project appears in the list without a full page reload.
      router.refresh()
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    reset()
    setError('')
  }

  return (
    <>

      {/* ── Trigger button ── */}
      {/* Primary button spec: fp-accent bg, white text, rounded-lg, DM Sans 500 */}
      <button
        onClick={() => setIsOpen(true)}
        className="
          flex items-center gap-1.5
          bg-fp-accent hover:bg-fp-accent-hover
          text-fp-base text-sm font-semibold
          px-4 py-2 rounded-lg
          transition-colors duration-150
        "
      >
        <Plus className="w-4 h-4" />
        New Project
      </button>

      {/* ── Modal ── */}
      {/* Conditionally rendered — only in the DOM when open */}
      {isOpen && (
        // Fixed overlay — covers the entire viewport
        // onClick on the overlay itself (not its children) closes the modal
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >

          {/* Dimmed overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal box */}
          {/* bg-fp-raised floats above the page surface */}
          {/* max-h + overflow-y-auto makes it scrollable on small screens */}
          <div className="
            relative z-10 bg-fp-raised border border-fp-border rounded-xl
            w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl
          ">

            {/* ── Modal header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-fp-border">
              <div>
                <h2 className="text-fp-text-primary text-base font-semibold">
                  New Project
                </h2>
                <p className="text-fp-text-tertiary text-xs mt-0.5">
                  Your client will receive a private portal link.
                </p>
              </div>
              {/* Close icon — ghost button, top-right */}
              <button
                onClick={handleClose}
                className="
                  text-fp-text-tertiary hover:text-fp-text-primary
                  p-1.5 rounded-lg hover:bg-fp-surface
                  transition-colors duration-150
                "
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

              {/* Error message — shown if API call fails */}
              {error && (
                <div className="bg-fp-danger/10 border border-fp-danger/20 text-fp-danger text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* ── Project details section ── */}
              <div className="space-y-4">
                <p className="text-fp-text-tertiary text-[11px] font-bold uppercase tracking-widest">
                  Project Details
                </p>

                {/* Project name */}
                <div>
                  <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
                    Project Name
                  </label>
                  <input
                    {...register('name')}
                    placeholder="e.g. Website Redesign"
                    className="
                      w-full bg-fp-base border border-fp-border text-fp-text-primary
                      text-sm rounded-lg px-3 py-2.5
                      placeholder:text-fp-text-tertiary
                      focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
                      transition-colors duration-150
                    "
                  />
                  {errors.name && (
                    <p className="text-fp-danger text-xs mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Description — optional */}
                <div>
                  <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
                    Description
                    <span className="text-fp-text-tertiary font-normal ml-1">(optional)</span>
                  </label>
                  <textarea
                    {...register('description')}
                    placeholder="Brief description of the project scope"
                    rows={2}
                    className="
                      w-full bg-fp-base border border-fp-border text-fp-text-primary
                      text-sm rounded-lg px-3 py-2.5
                      placeholder:text-fp-text-tertiary
                      focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
                      resize-none transition-colors duration-150
                    "
                  />
                </div>
              </div>

              {/* Divider between project and client sections */}
              <div className="border-t border-fp-border" />

              {/* ── Client details section ── */}
              {/* Grouped separately — these are about a different entity (the client) */}
              <div className="space-y-4">
                <p className="text-fp-text-tertiary text-[11px] font-bold uppercase tracking-widest">
                  Client Details
                </p>

                {/* Client name */}
                <div>
                  <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
                    Client Name
                  </label>
                  <input
                    {...register('clientName')}
                    placeholder="e.g. Rahul Sharma"
                    className="
                      w-full bg-fp-base border border-fp-border text-fp-text-primary
                      text-sm rounded-lg px-3 py-2.5
                      placeholder:text-fp-text-tertiary
                      focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
                      transition-colors duration-150
                    "
                  />
                  {errors.clientName && (
                    <p className="text-fp-danger text-xs mt-1">{errors.clientName.message}</p>
                  )}
                </div>

                {/* Client email */}
                <div>
                  <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
                    Client Email
                  </label>
                  <input
                    {...register('clientEmail')}
                    type="email"
                    placeholder="rahul@company.com"
                    className="
                      w-full bg-fp-base border border-fp-border text-fp-text-primary
                      text-sm rounded-lg px-3 py-2.5
                      placeholder:text-fp-text-tertiary
                      focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
                      transition-colors duration-150
                    "
                  />
                  {errors.clientEmail && (
                    <p className="text-fp-danger text-xs mt-1">{errors.clientEmail.message}</p>
                  )}
                </div>
              </div>

              {/* ── Submit buttons ── */}
              <div className="flex gap-3 pt-1">

                {/* Cancel — secondary button spec: transparent bg, border, secondary text */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="
                    flex-1 border border-fp-border text-fp-text-secondary
                    text-sm font-medium py-2.5 rounded-lg
                    hover:bg-fp-surface hover:text-fp-text-primary
                    transition-colors duration-150
                  "
                >
                  Cancel
                </button>

                {/* Create — primary button spec */}
                {/* disabled:opacity-50 gives feedback that the button isn't interactive */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="
                    flex-1 flex items-center justify-center gap-2
                    bg-fp-accent hover:bg-fp-accent-hover
                    disabled:opacity-50 disabled:cursor-not-allowed
                    text-fp-base text-sm font-semibold py-2.5 rounded-lg
                    transition-colors duration-150
                  "
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {isLoading ? 'Creating...' : 'Create Project'}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}
    </>
  )
}