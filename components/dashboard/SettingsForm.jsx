// components/dashboard/SettingsForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The settings form. Two card sections:
//   1. Profile Photo — avatar upload with instant preview
//   2. Profile Info — name, email (read-only), bio, portfolio URL
//
// Followed by a live portal preview strip showing exactly what the client will
// see on the FreelancerCard — making the "endowment effect" concrete and tangible.
//
// Design decisions:
// - Two separate card sections instead of one long form. Each section has ONE
//   job. This reduces cognitive load — the freelancer knows exactly where to
//   look for each thing.
// - The avatar section is visual-first: the photo is the dominant element,
//   the upload button is secondary. The freelancer should think "my face is
//   the thing" not "the button is the thing."
// - The bio char counter (X/120) is inline below the input — live feedback
//   prevents the frustration of hitting a limit mid-sentence.
// - The portfolio URL input has a live external link icon — appears the moment
//   a URL is typed, lets the freelancer preview without leaving the page.
// - The portal preview strip at the bottom uses portal tokens (fp-portal-*)
//   inside the dark dashboard. This creates a "window into the other world"
//   effect — the freelancer can see exactly what the client sees.
// - Save button: fp-accent (indigo), primary spec. On success a brief
//   "Saved" confirmation appears — green, then fades. This is the completion
//   moment. It should feel satisfying.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState, useRef } from 'react'
import { Loader2, Upload, ExternalLink, CheckCircle2, User } from 'lucide-react'
import axios from 'axios'

export default function SettingsForm({ user }) {
  const [name,         setName]         = useState(user.name         ?? '')
  const [bio,          setBio]          = useState(user.bio          ?? '')
  const [portfolioUrl, setPortfolioUrl] = useState(user.portfolioUrl ?? '')

  // avatarPreview — what shows in the circle.
  // Starts from the saved Cloudinary URL.
  // On new file pick: updates immediately via URL.createObjectURL()
  // so the freelancer sees the new photo before saving.
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl ?? null)
  const [avatarFile,    setAvatarFile]    = useState(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saved,        setSaved]        = useState(false)

  const fileInputRef = useRef(null)

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    // createObjectURL creates a temporary local URL — instant preview
    // without uploading yet. No API call at this point.
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSaved(false)

    try {
      if (avatarFile) {
        // When a new avatar is selected, we must send multipart/form-data
        // because the API route handles file upload to Cloudinary.
        const formData = new FormData()
        formData.append('name',         name.trim())
        formData.append('bio',          bio.trim())
        formData.append('portfolioUrl', portfolioUrl.trim())
        formData.append('avatar',       avatarFile)

        await axios.patch('/api/settings', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        // Text-only update — plain JSON, no file handling needed.
        await axios.patch('/api/settings', {
          name:         name.trim(),
          bio:          bio.trim(),
          portfolioUrl: portfolioUrl.trim(),
        })
      }

      setSaved(true)
      setAvatarFile(null)
      // "Saved" confirmation disappears after 3s — don't clutter the UI
      setTimeout(() => setSaved(false), 3000)

    } catch (error) {
      alert(error.response?.data?.error ?? 'Failed to save settings.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Section 1: Profile Photo ──────────────────────────────────────── */}
      <div className="bg-fp-surface border border-fp-border rounded-xl p-5">
        <p className="text-fp-text-secondary text-[10px] font-bold uppercase tracking-widest mb-5">
          Profile Photo
        </p>

        <div className="flex items-center gap-5">

          {/* Avatar preview — the dominant element in this section */}
          <div className="shrink-0">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile photo"
                className="w-20 h-20 rounded-full object-cover border-2 border-fp-border"
              />
            ) : (
              // Initials placeholder — accent-colored so it doesn't look broken
              <div className="
                w-20 h-20 rounded-full border-2 border-fp-border
                bg-fp-accent-muted flex items-center justify-center
              ">
                <span className="font-display text-2xl font-medium text-fp-accent">
                  {name.charAt(0).toUpperCase() || <User className="w-8 h-8 text-fp-accent" />}
                </span>
              </div>
            )}
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="
                flex items-center gap-2 text-sm font-medium
                border border-fp-border text-fp-text-secondary
                hover:bg-fp-raised hover:text-fp-text-primary
                px-4 py-2 rounded-lg transition-colors duration-150
              "
            >
              <Upload className="w-3.5 h-3.5" />
              {avatarPreview ? 'Change photo' : 'Upload photo'}
            </button>
            <p className="text-fp-text-tertiary text-xs mt-2 leading-relaxed">
              JPG, PNG or WebP. Cropped to a square.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Profile Info ───────────────────────────────────────── */}
      <div className="bg-fp-surface border border-fp-border rounded-xl p-5 space-y-5">
        <p className="text-fp-text-secondary text-[10px] font-bold uppercase tracking-widest">
          Profile Info
        </p>

        {/* Name */}
        <div>
          <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className="
              w-full bg-fp-base border border-fp-border text-fp-text-primary
              text-sm rounded-lg px-3 py-2.5
              placeholder:text-fp-text-tertiary
              focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
              transition-colors duration-150
            "
          />
        </div>

        {/* Email — read only — freelancers can't change this here */}
        <div>
          <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={user.email}
            disabled
            className="
              w-full bg-fp-base border border-fp-border
              text-fp-text-tertiary text-sm rounded-lg px-3 py-2.5
              cursor-not-allowed opacity-60
            "
          />
          <p className="text-fp-text-tertiary text-[10px] mt-1">
            Email cannot be changed here.
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
            One-line Bio
            <span className="text-fp-text-tertiary font-normal ml-1">(optional)</span>
          </label>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="e.g. Full-stack developer based in Goa, India"
            maxLength={120}
            className="
              w-full bg-fp-base border border-fp-border text-fp-text-primary
              text-sm rounded-lg px-3 py-2.5
              placeholder:text-fp-text-tertiary
              focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
              transition-colors duration-150
            "
          />
          {/* Live char counter — below the input, right-aligned */}
          <div className="flex items-center justify-between mt-1">
            <p className="text-fp-text-tertiary text-[10px]">
              Shown on your client portal.
            </p>
            <p className={`text-[10px] font-medium ${bio.length > 100 ? 'text-fp-warning' : 'text-fp-text-tertiary'}`}>
              {bio.length}/120
            </p>
          </div>
        </div>

        {/* Portfolio URL */}
        <div>
          <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
            Portfolio URL
            <span className="text-fp-text-tertiary font-normal ml-1">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="
                w-full bg-fp-base border border-fp-border text-fp-text-primary
                text-sm rounded-lg px-3 py-2.5 pr-10
                placeholder:text-fp-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
                transition-colors duration-150
              "
            />
            {/* External link icon — appears as soon as a URL is entered */}
            {/* Lets the freelancer preview their site without leaving the page */}
            {portfolioUrl && (
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  absolute right-3 top-1/2 -translate-y-1/2
                  text-fp-text-tertiary hover:text-fp-accent
                  transition-colors duration-150
                "
                title="Preview your portfolio"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Portal preview strip ──────────────────────────────────────────── */}
      {/* A "window into the client's world" — shows exactly what FreelancerCard
          renders in the portal, using portal tokens inside the dark dashboard.
          Psychology: the freelancer sees their own face from the client's perspective.
          This makes the form feel meaningful, not administrative. */}
      <div className="bg-fp-surface border border-fp-border rounded-xl p-5">
        <p className="text-fp-text-tertiary text-[10px] font-bold uppercase tracking-widest mb-4">
          Client Portal Preview
        </p>

        {/* Simulated FreelancerCard — uses portal tokens deliberately */}
        <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-4">

          <p className="text-[10px] font-bold uppercase tracking-widest text-fp-portal-text-tertiary mb-3">
            Your Developer
          </p>

          <div className="flex items-center gap-3">

            {/* Avatar preview — same logic as the main avatar above */}
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={name}
                className="w-10 h-10 rounded-full object-cover border border-fp-portal-border shrink-0"
              />
            ) : (
              <div className="
                w-10 h-10 rounded-full shrink-0 flex items-center justify-center
                border border-fp-portal-border bg-fp-portal-raised
                text-sm font-bold
              " style={{ color: 'var(--color-fp-portal-accent)' }}>
                {name.charAt(0).toUpperCase() || '?'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-fp-portal-text-primary text-sm font-semibold leading-snug truncate">
                {name || 'Your name'}
              </p>
              {bio && (
                <p className="text-fp-portal-text-secondary text-xs mt-0.5 leading-relaxed line-clamp-1">
                  {bio}
                </p>
              )}
            </div>

          </div>

          {portfolioUrl && (
            <div className="flex items-center gap-1.5 mt-3 text-xs font-medium" style={{ color: 'var(--color-fp-portal-accent)' }}>
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {portfolioUrl.replace(/^https?:\/\//, '')}
              </span>
            </div>
          )}

        </div>

        <p className="text-fp-text-tertiary text-[10px] mt-2.5 leading-relaxed">
          This is what your client sees when they open their portal.
        </p>
      </div>

      {/* ── Save button + confirmation ────────────────────────────────────── */}
      <div className="flex items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="
            flex items-center gap-2
            bg-fp-accent hover:bg-fp-accent-hover text-fp-base
            text-sm font-semibold px-6 py-2.5 rounded-lg
            transition-colors duration-150 disabled:opacity-50
          "
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            'Save Changes'
          )}
        </button>

        {/* Save confirmation — appears briefly, then fades */}
        {/* CheckCircle2 in success green — the completion moment */}
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-fp-success font-medium animate-in fade-in duration-300">
            <CheckCircle2 className="w-4 h-4" />
            Saved
          </div>
        )}
      </div>

    </form>
  )
}