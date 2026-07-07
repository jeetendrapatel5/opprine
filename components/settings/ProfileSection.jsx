'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, CheckCircle2, ExternalLink, Loader2, Upload, User } from 'lucide-react'
import Field from './Field'

export default function ProfileSection({ user }) {
  const [form, setForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    portfolioUrl: user.portfolioUrl || '',
    username: user.username || '',
    profileTagline: user.profileTagline || '',
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl || '')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(form.avatarUrl || '')
      return undefined
    }

    const objectUrl = URL.createObjectURL(avatarFile)
    setAvatarPreview(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [avatarFile, form.avatarUrl])

  function handleChange(e) {
    const { name: field, value } = e.target
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
    setError(null)
  }

  function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setSaved(false)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      let res

      if (avatarFile) {
        const fd = new FormData()
        fd.append('name', form.name)
        fd.append('bio', form.bio)
        fd.append('portfolioUrl', form.portfolioUrl)
        fd.append('username', form.username)
        fd.append('profileTagline', form.profileTagline)
        fd.append('avatar', avatarFile)
        res = await fetch('/api/settings', { method: 'PATCH', body: fd })
      } else {
        res = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      setForm((prev) => ({
        ...prev,
        name: data.name ?? prev.name,
        bio: data.bio ?? prev.bio,
        avatarUrl: data.avatarUrl ?? prev.avatarUrl,
        portfolioUrl: data.portfolioUrl ?? prev.portfolioUrl,
        username: data.username ?? prev.username,
        profileTagline: data.profileTagline ?? prev.profileTagline,
      }))
      setAvatarFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-fp-border bg-fp-base px-3.5 py-2.5 text-sm text-fp-text-primary placeholder:text-fp-text-tertiary outline-none transition-colors duration-150 focus:border-fp-accent/60 focus:ring-2 focus:ring-fp-accent/20'

  const hasPortfolio = Boolean(form.portfolioUrl)
  const hasBio = Boolean(form.bio?.trim())
  const hasAvatar = Boolean(avatarPreview)
  const completionCount = [hasAvatar, Boolean(form.username), hasPortfolio, hasBio].filter(Boolean).length

  return (
    <section className="overflow-hidden rounded-2xl border border-fp-border bg-fp-surface/90 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]">
      <div className="border-b border-fp-border px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-fp-border bg-fp-raised">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-semibold text-fp-text-secondary">
                  {form.name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="avatar-upload"
                className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-fp-accent transition-colors hover:text-fp-accent-hover"
              >
                <Upload size={14} />
                {avatarFile ? 'Photo ready to save' : 'Change photo'}
              </label>
              <input
                ref={fileInputRef}
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarPick}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <Field label="Full name">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className={inputClass}
            placeholder="Your name"
          />
        </Field>

        <Field label="Username">
          <div className="flex overflow-hidden rounded-xl border border-fp-border transition-colors duration-150 focus-within:border-fp-accent/60 focus-within:ring-2 focus-within:ring-fp-accent/20">
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              className="min-w-0 flex-1 bg-fp-base px-3.5 py-2.5 text-sm text-fp-text-primary outline-none placeholder:text-fp-text-tertiary"
              placeholder="jeetu"
            />
          </div>
        </Field>

        <Field label="Portfolio URL">
          <div className="relative">
            <input
              name="portfolioUrl"
              value={form.portfolioUrl}
              onChange={handleChange}
              className={`${inputClass} pr-10`}
              placeholder="https://jeetu.dev"
            />
            {form.portfolioUrl && (
              <a
                href={form.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fp-text-tertiary transition-colors hover:text-fp-accent"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </Field>

        <Field label="Tagline">
          <input
            name="profileTagline"
            value={form.profileTagline}
            onChange={handleChange}
            className={inputClass}
            placeholder="I build fast, conversion-focused SaaS products."
          />
        </Field>
      </div>

      <div className="border-y border-fp-border px-5 py-5 sm:px-6">
        <Field label="Bio">
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={4}
            className={`${inputClass} resize-none`}
            placeholder="Full-stack developer based in Goa"
          />
        </Field>
      </div>

      <div className="border-b border-fp-border px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fp-text-tertiary">
            Client preview
          </p>
          <div className="rounded-xl border border-fp-border bg-fp-base/60 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-fp-border bg-fp-raised">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={form.name || 'Profile preview'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={18} className="text-fp-text-tertiary" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fp-text-primary">
                  {form.name || 'Your name'}
                </p>
                <p className="truncate text-xs text-fp-text-secondary">
                  {form.username ? `freeport.io/u/${form.username}` : 'Public profile link'}
                </p>
              </div>
            </div>

            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${form.username ? 'border-fp-success/25 bg-fp-success/10 text-fp-success' : 'border-fp-border bg-fp-raised text-fp-text-tertiary'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${form.username ? 'bg-fp-success' : 'bg-fp-border'}`} />
              {form.username ? 'Published' : 'Draft'}
            </span>

            <p className="mt-3 text-sm font-semibold leading-6 text-fp-text-primary">
              {form.profileTagline || 'Add a tagline to sharpen the first impression.'}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-fp-text-secondary">
              {form.bio || 'Your bio will appear here when clients open the portal.'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-h-5 text-sm">
          {error ? (
            <p className="text-fp-danger">{error}</p>
          ) : saved ? (
            <p className="inline-flex items-center gap-1.5 text-fp-success">
              <CheckCircle2 size={14} />
              Saved
            </p>
          ) : (
            <p className="text-fp-text-tertiary">Ready to save changes.</p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-fp-accent px-5 py-2.5 text-sm font-semibold text-fp-base transition-colors duration-150 hover:bg-fp-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </section>
  )
}

function MiniStat({ label, value, active }) {
  return (
    <div className="rounded-xl border border-fp-border bg-fp-raised px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fp-text-tertiary">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${active ? 'text-fp-text-primary' : 'text-fp-text-secondary'}`}>
        {value}
      </p>
    </div>
  )
}

