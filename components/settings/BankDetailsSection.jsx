// components/settings/BankDetailsSection.jsx
'use client'
// Same reason as every settings file so far: this needs useState and
// onClick, which only work in the browser, not on the server.

import { useState } from 'react'
import { Landmark, Eye, EyeOff, Trash2, Star, Loader2, Plus } from 'lucide-react'
import Field from './Field'

export default function BankDetailsSection({ bankAccounts: initialAccounts }) {

  const [accounts, setAccounts] = useState(initialAccounts)

  const [showAddForm, setShowAddForm] = useState(false)

  const [revealedId, setRevealedId] = useState(null)
  const [revealedData, setRevealedData] = useState(null)
  const [revealing, setRevealing] = useState(false)

  const [error, setError] = useState(null)

  // Reveal an account's real number 
  async function handleReveal(id) {
    if (revealedId === id) {
      setRevealedId(null)
      setRevealedData(null)
      return
    }

    setRevealing(true)
    setError(null)
    try {
      const res = await fetch(`/api/bank-accounts/${id}/reveal`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not reveal account')

      setRevealedId(id)
      setRevealedData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setRevealing(false)
    }
  }

  // Set an account as default
  async function handleSetDefault(id) {
    setError(null)
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Could not update default account')
      }

      setAccounts((prev) =>
        prev.map((acc) => ({ ...acc, isDefault: acc.id === id }))
      )
    } catch (err) {
      setError(err.message)
    }
  }

  // Delete an account
  async function handleDelete(id) {

    const ok = window.confirm('Delete this bank account? This cannot be undone.')
    if (!ok) return

    setError(null)
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Could not delete account')
      }

      setAccounts((prev) => prev.filter((acc) => acc.id !== id))

      if (revealedId === id) {
        setRevealedId(null)
        setRevealedData(null)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  function handleAccountAdded(newAccount) {
    setAccounts((prev) => {

      const updated = newAccount.isDefault
        ? prev.map((acc) => ({ ...acc, isDefault: false }))
        : prev
      return [newAccount, ...updated]
    })
    setShowAddForm(false)
  }

  return (
    <div className="space-y-4">

      {/* ── Section header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-fp-text-primary">Bank Details</h2>
          <p className="text-sm text-fp-text-secondary mt-0.5">
            Stored securely and only visible to you.
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-fp-accent rounded-full hover:bg-fp-accent/80 cursor-pointer px-2 py-1.5 flex items-center gap-1.5 text-sm"
          >
            <Plus size={14} /> Add account
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* ── The add form, shown only when toggled open ────────────────── */}
      {showAddForm && (
        <AddBankAccountForm
          onSuccess={handleAccountAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* ── Empty state ────────────────────────────────────────────────
          Shown only if there are truly zero accounts AND the form isn't
          already open (no point showing "you have none" right above the
          form meant to fix that). */}
      {accounts.length === 0 && !showAddForm && (
        <div className="border border-dashed border-fp-border rounded-xl p-8 text-center">
          <Landmark size={24} className="mx-auto text-fp-text-secondary mb-2" />
          <p className="text-sm text-fp-text-secondary">
            No bank accounts added yet.
          </p>
        </div>
      )}

      {/* ── The list ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="bg-fp-surface border border-fp-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-fp-text-primary text-sm">
                    {account.label}
                  </span>
                  {account.isDefault && (
                    <span className="text-xs bg-fp-accent/10 text-fp-accent px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-fp-text-secondary mt-0.5">
                  {account.bankName} · {account.accountHolderName}
                </p>

                {/* This is the key visual logic: show the masked number
                    UNLESS this specific account is the currently revealed
                    one AND we have data back for it — then show the real
                    number instead. */}
                <p className="text-sm font-mono text-fp-text-primary mt-2">
                  {revealedId === account.id && revealedData
                    ? revealedData.accountNumber
                    : `•••• ${account.accountNumberLast4}`}
                </p>
                {revealedId === account.id && revealedData?.routingCode && (
                  <p className="text-xs text-fp-text-secondary mt-1">
                    Routing/IFSC: {revealedData.routingCode}
                  </p>
                )}
              </div>

              {/* ── Action buttons ─────────────────────────────────── */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleReveal(account.id)}
                  disabled={revealing}
                  title={revealedId === account.id ? 'Hide number' : 'Show number'}
                  className="p-1.5 rounded-lg hover:bg-fp-surface-hover text-fp-text-secondary"
                >
                  {revealing && revealedId !== account.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : revealedId === account.id ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>

                {!account.isDefault && (
                  <button
                    onClick={() => handleSetDefault(account.id)}
                    title="Set as default"
                    className="p-1.5 rounded-lg hover:bg-fp-surface-hover text-fp-text-secondary"
                  >
                    <Star size={16} />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(account.id)}
                  title="Delete"
                  className="p-1.5 rounded-lg hover:bg-red-50 text-fp-text-secondary hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddBankAccountForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({
    label: '',
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    routingCode: '',
    currency: 'INR',
    country: '',
    isDefault: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // One shared function for every input in this form.
  // Text inputs give you e.target.value. Checkboxes are different —
  // they give you e.target.checked (true/false) instead. This function
  // checks `type` to know which one to use.
  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    // Browsers reload the whole page when a <form> submits, by default.
    // preventDefault() stops that so we can send the data with fetch()
    // instead, and stay on the same page.
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save bank account')

      // Send the newly created account UP to BankDetailsSection, which
      // will add it to the visible list and close this form.
      onSuccess(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nickname">
          <input
            name="label"
            value={form.label}
            onChange={handleChange}
            placeholder="HDFC — Primary"
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none"
          />
        </Field>

        <Field label="Bank name">
          <input
            name="bankName"
            value={form.bankName}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none"
          />
        </Field>

        <Field label="Account holder name">
          <input
            name="accountHolderName"
            value={form.accountHolderName}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none"
          />
        </Field>

        <Field label="Currency">
          <select
            name="currency"
            value={form.currency}
            onChange={handleChange}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </Field>

        <Field label="Account number">
          <input
            name="accountNumber"
            value={form.accountNumber}
            onChange={handleChange}
            required
            type="password"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none"
          />
        </Field>

        <Field label="IFSC / SWIFT / Routing code">
          <input
            name="routingCode"
            value={form.routingCode}
            onChange={handleChange}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-400">
        <input
          type="checkbox"
          name="isDefault"
          checked={form.isDefault}
          onChange={handleChange}
        />
        Set as default account
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 text-sm font-medium text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Saving...' : 'Save account'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-neutral-400 hover:text-white px-4 py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}