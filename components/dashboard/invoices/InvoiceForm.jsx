// components/dashboard/invoices/InvoiceForm.jsx
'use client'

import { useState } from 'react'
import { Plus, Loader2, FileText, X } from 'lucide-react'
import axios from 'axios'

// Props:
//   projectId   — string — the project this invoice belongs to
//   milestones  — array  — project milestones, for the optional milestone link
//   onSuccess   — function(newInvoice) — called after successful creation
//                 parent uses this to add the invoice to local state

export default function InvoiceForm({ projectId, milestones = [], onSuccess }) {
  const [isOpen,       setIsOpen]       = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form fields — each mirrors a field in the POST body
  const [amount,      setAmount]      = useState('')
  const [currency,    setCurrency]    = useState('USD')
  const [dueDate,     setDueDate]     = useState('')
  const [note,        setNote]        = useState('')
  const [milestoneId, setMilestoneId] = useState('')

  const reset = () => {
    setAmount('')
    setCurrency('USD')
    setDueDate('')
    setNote('')
    setMilestoneId('')
    setIsOpen(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert('Please enter a valid amount.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await axios.post('/api/invoices', {
        projectId,
        amount:      Number(amount),
        currency,
        dueDate:     dueDate     || null,
        note:        note.trim() || null,
        milestoneId: milestoneId || null,
      })

      // Tell the parent to add this invoice to its local list
      onSuccess(response.data)
      reset()

    } catch (error) {
      const message = error.response?.data?.error ?? 'Failed to create invoice.'
      alert(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Collapsed state — just a button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Invoice
      </button>
    )
  }

  // Expanded state — the full form
  return (
    <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm">
      {/* Form header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-gray-900">New Invoice</h3>
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Amount + Currency — side by side */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Amount <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="2500"
              min="0"
              step="0.01"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              required
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Currency
            </label>
            {/* Common currencies — expand this list later if needed */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="INR">INR</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
            Due Date <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
        </div>

        {/* Link to milestone — optional */}
        {milestones.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Link to Milestone <span className="text-gray-400">(optional)</span>
            </label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white"
            >
              <option value="">General project invoice</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              Linking to a milestone lets the client see which deliverable this invoice is for.
            </p>
          </div>
        )}

        {/* Note to client */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
            Note to Client <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. This covers the first phase of development as agreed."
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
          />
        </div>

        {/* Stripe notice — sets expectations before submitting */}
        <div className="flex items-start gap-2 bg-indigo-50 rounded-xl p-3">
          <span className="text-base leading-none mt-0.5">💳</span>
          <p className="text-xs text-indigo-700 leading-relaxed">
            A Stripe Payment Link will be generated automatically. Your client can pay
            directly from their portal — no account needed.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={reset}
            className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !amount}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              : <><Plus    className="w-4 h-4" /> Create Invoice</>
            }
          </button>
        </div>

      </form>
    </div>
  )
}