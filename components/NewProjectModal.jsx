// components/NewProjectModal.jsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { X, Plus, Loader2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  clientName: z.string().min(2, 'Client name must be at least 2 characters'),
  clientEmail: z.string().email('Please enter a valid email'),
})

export default function NewProjectModal({ userId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
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
      <button
        onClick={() => setIsOpen(true)}
        className="
          flex items-center gap-1.5
          bg-fp-accent hover:bg-fp-accent-hover
          text-fp-base text-sm font-semibold
          px-4 py-2 rounded-full
          transition-colors duration-150 cursor-pointer
        "
      >
        <Plus className="w-4 h-4" />
        New Project
      </button>

      {/* ── Modal ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          {/* Dimmed overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* ── Modal box ──
              flex flex-col      → stacks header and form top-to-bottom as two
                                   separate regions, instead of one blob of content
              max-h-[90vh]       → caps total modal height at 90% of screen
              overflow-hidden    → clips anything (like the form's scrollbar) that
                                   would otherwise poke past the rounded corners

              The header below is a fixed region (flex-shrink-0 → never scrolls).
              The <form> below it is the ONLY scrolling region: it gets flex-1
              (take remaining height), min-h-0 (the flexbox trick that allows a
              flex child to actually shrink and scroll instead of growing to fit
              its content), and overflow-y-auto (the real scrollbar).
              The custom scrollbar styling has moved onto the form for that reason.
          */}
          <div className="
            relative z-10 w-full max-w-md
            bg-fp-raised border border-fp-border rounded-xl shadow-2xl
            max-h-[90vh] overflow-hidden
            flex flex-col
          ">

            {/* ── Modal header ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-fp-border">
              <div>
                <h2 className="text-fp-text-primary text-base font-semibold">
                  New Project
                </h2>
                <p className="text-fp-text-secondary text-sm mt-0.5">
                  Your client will receive a private portal link.
                </p>
              </div>
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
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="
                flex-1 min-h-0 overflow-y-auto
                px-6 py-5 space-y-4
                [&::-webkit-scrollbar]:w-1.5
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-fp-border
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb:hover]:bg-fp-text-tertiary
              "
            >

              {/* Error banner */}
              {error && (
                <div className="bg-fp-danger/10 border border-fp-danger/20 text-fp-danger text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* ── Project details ── */}
              <div className="space-y-4">
                <p className="text-fp-text-tertiary text-[11px] font-bold uppercase tracking-widest">
                  Project Details
                </p>

                <div>
                  <label className="block text-fp-text-secondary text-md font-medium mb-1.5">
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

                <div>
                  <label className="block text-fp-text-secondary text-md font-medium mb-1.5">
                    Description
                    <span className="text-fp-text-tertiary font-normal ml-1">(optional)</span>
                  </label>
                  <textarea
                    {...register('description')}
                    placeholder="Brief description of the project scope"
                    rows={2}
                    className="
    w-full bg-fp-base border-fp-border text-fp-text-primary
    text-sm rounded-lg px-3 h-30 py-2.5
    placeholder:text-fp-text-tertiary
    focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
    resize-none transition-colors duration-150
    [&::-webkit-scrollbar]:w-1.5
    [&::-webkit-scrollbar-track]:bg-transparent
    [&::-webkit-scrollbar-thumb]:bg-fp-border
    [&::-webkit-scrollbar-thumb]:rounded-full
    [&::-webkit-scrollbar-thumb:hover]:bg-fp-text-tertiary
  "
                  />
                </div>
              </div>

              <div className="border-t border-fp-border" />

              {/* ── Client details ── */}
              <div className="space-y-4">
                <p className="text-fp-text-tertiary text-[11px] font-bold uppercase tracking-widest">
                  Client Details
                </p>

                <div>
                  <label className="block text-fp-text-secondary text-md font-medium mb-1.5">
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

                <div>
                  <label className="block text-fp-text-secondary text-md font-medium mb-1.5">
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
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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