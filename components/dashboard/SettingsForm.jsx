// components/dashboard/SettingsForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Two independent save flows:
//
//   FLOW 1 — Public Profile (new): username, profileEnabled, profileTagline
//            Saves to PATCH /api/users/profile
//            Has its own "Save" button
//
//   FLOW 2 — Profile Photo + Info (existing): name, bio, avatar, portfolioUrl
//            Saves to PATCH /api/settings (existing route, unchanged)
//            Has its own "Save Changes" button
//
// WHY two separate flows instead of one big form:
// The username and profile toggle are high-stakes — getting the username
// wrong affects the public URL. Keeping it separate from the photo/bio
// section prevents accidental overwrites and makes the two concerns clear.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState, useRef } from 'react'
import {
  Loader2, Upload, ExternalLink, CheckCircle2, User,
  Globe, Eye, EyeOff, Copy, Check,
} from 'lucide-react'
import axios from 'axios'

export default function SettingsForm({ user }) {

  // ── Flow 1 state: Public profile ──────────────────────────────────────────
  const [username,       setUsername]       = useState(user.username       ?? '')
  const [profileEnabled, setProfileEnabled] = useState(user.profileEnabled ?? false)
  const [profileTagline, setProfileTagline] = useState(user.profileTagline ?? '')

  const [profileSaving,    setProfileSaving]    = useState(false)
  const [profileSaveStatus, setProfileSaveStatus] = useState('idle') // idle | saved | error
  const [usernameError,    setUsernameError]    = useState('')
  const [isUrlCopied,      setIsUrlCopied]      = useState(false)

  // ── Flow 2 state: Photo + info (existing) ─────────────────────────────────
  const [name,         setName]         = useState(user.name         ?? '')
  const [bio,          setBio]          = useState(user.bio          ?? '')
  const [portfolioUrl, setPortfolioUrl] = useState(user.portfolioUrl ?? '')
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl  ?? null)
  const [avatarFile,    setAvatarFile]   = useState(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saved,        setSaved]        = useState(false)

  const fileInputRef = useRef(null)

  // ── Username validation ────────────────────────────────────────────────────
  const handleUsernameChange = (value) => {
    // Auto-lowercase and replace spaces with hyphens as they type
    const cleaned = value.toLowerCase().replace(/\s+/g, '-')
    setUsername(cleaned)

    if (cleaned && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(cleaned)) {
      setUsernameError('Only lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.')
    } else if (cleaned && cleaned.length < 3) {
      setUsernameError('Must be at least 3 characters.')
    } else {
      setUsernameError('')
    }
  }

  const handleCopyProfileUrl = () => {
    const url = `${window.location.origin}/u/${username}`
    navigator.clipboard.writeText(url)
    setIsUrlCopied(true)
    setTimeout(() => setIsUrlCopied(false), 2000)
  }

  // ── Flow 1 save ────────────────────────────────────────────────────────────
  const handleProfileSave = async () => {
    if (usernameError) return
    setProfileSaving(true)
    setProfileSaveStatus('idle')
    try {
      await axios.patch('/api/users/profile', {
        username:       username      || null,
        profileEnabled,
        profileTagline: profileTagline || null,
      })
      setProfileSaveStatus('saved')
      setTimeout(() => setProfileSaveStatus('idle'), 2000)
    } catch (error) {
      const msg = error.response?.data?.error ?? 'Failed to save.'
      if (msg.includes('username') || msg.includes('Username')) {
        setUsernameError(msg)
      }
      setProfileSaveStatus('error')
      setTimeout(() => setProfileSaveStatus('idle'), 3000)
    } finally {
      setProfileSaving(false)
    }
  }

  // ── Flow 2 save (existing) ─────────────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSaved(false)
    try {
      if (avatarFile) {
        const formData = new FormData()
        formData.append('name',         name.trim())
        formData.append('bio',          bio.trim())
        formData.append('portfolioUrl', portfolioUrl.trim())
        formData.append('avatar',       avatarFile)
        await axios.patch('/api/settings', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await axios.patch('/api/settings', {
          name:         name.trim(),
          bio:          bio.trim(),
          portfolioUrl: portfolioUrl.trim(),
        })
      }
      setSaved(true)
      setAvatarFile(null)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      alert(error.response?.data?.error ?? 'Failed to save settings.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Shared input class ─────────────────────────────────────────────────────
  const inputClass = `
    w-full bg-fp-base border border-fp-border text-fp-text-primary
    text-sm rounded-lg px-3 py-2.5
    placeholder:text-fp-text-tertiary
    focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
    transition-colors duration-150
  `

  return (
    <div className="space-y-5">

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION: PUBLIC PROFILE (new)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-fp-surface border border-fp-border rounded-xl p-5 space-y-5">
        <p className="text-fp-text-secondary text-[10px] font-bold uppercase tracking-widest">
          Public Portfolio
        </p>
        <p className="text-fp-text-tertiary text-xs leading-relaxed -mt-2">
          Set up your public profile to showcase all your published case studies in one place.
        </p>

        {/* Enable portfolio toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-fp-text-primary text-sm font-medium">
              Enable public portfolio
            </p>
            <p className="text-fp-text-tertiary text-xs mt-0.5 leading-relaxed">
              {profileEnabled
                ? 'Your portfolio is live and findable.'
                : 'Off — your portfolio page returns 404.'
              }
            </p>
          </div>
          <button
            type="button"
            onClick={() => setProfileEnabled(v => !v)}
            className={`
              relative shrink-0 rounded-full transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-fp-accent/30
              ${profileEnabled ? 'bg-fp-accent' : 'bg-fp-border'}
            `}
            style={{ width: '40px', height: '22px' }}
            aria-pressed={profileEnabled}
          >
            <span
              className={`
                absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm
                transition-transform duration-200
                ${profileEnabled ? 'translate-x-[18px]' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        {/* Username input */}
        <div>
          <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
            Username
          </label>
          {/* Prefix + input side by side — same pattern as StoryEditor slug */}
          <div className="flex rounded-lg overflow-hidden border border-fp-border focus-within:ring-2 focus-within:ring-fp-accent/30 focus-within:border-fp-accent/50 transition-colors duration-150">
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="your-username"
              maxLength={30}
              className="flex-1 bg-fp-base text-fp-text-primary text-sm px-3 py-2.5 placeholder:text-fp-text-tertiary outline-none min-w-0"
            />
          </div>
          {usernameError && (
            <p className="text-fp-danger text-[10px] mt-1">{usernameError}</p>
          )}

          {/* Live URL + copy — shown when username is valid and profile is enabled */}
          {/* {profileEnabled && username && !usernameError && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-fp-raised border border-fp-border rounded-lg">
              <Globe className="w-3 h-3 text-fp-accent shrink-0" />
              <span className="text-[10px] text-fp-text-secondary font-mono truncate flex-1">
                /u/{username}
              </span>
              <button
                type="button"
                onClick={handleCopyProfileUrl}
                className="text-fp-text-tertiary hover:text-fp-accent transition-colors shrink-0"
              >
                {isUrlCopied
                  ? <Check className="w-3 h-3 text-fp-success" />
                  : <Copy  className="w-3 h-3" />
                }
              </button>
              
              <a href={`/u/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fp-text-tertiary hover:text-fp-accent transition-colors shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )} */}
        </div>

        {/* Tagline input */}
        <div>
          <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
            Tagline
            <span className="text-fp-text-tertiary font-normal ml-1">(optional)</span>
          </label>
          <input
            type="text"
            value={profileTagline}
            onChange={(e) => setProfileTagline(e.target.value)}
            placeholder="e.g. I build fast, conversion-focused SaaS products."
            maxLength={140}
            className={inputClass}
          />
          <p className="text-fp-text-tertiary text-[10px] mt-1">
            Shown prominently on your portfolio page. Make it sell.{' '}
            <span className={profileTagline.length > 120 ? 'text-fp-warning' : ''}>
              {profileTagline.length}/140
            </span>
          </p>
        </div>

        {/* Flow 1 save button */}
        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={handleProfileSave}
            disabled={profileSaving || !!usernameError}
            className="
              flex items-center gap-2
              bg-fp-accent hover:bg-fp-accent-hover text-fp-base
              text-sm font-semibold px-5 py-2 rounded-lg
              transition-colors duration-150 disabled:opacity-50
            "
          >
            {profileSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : 'Save Profile'
            }
          </button>
          {profileSaveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 text-sm text-fp-success font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </div>
          )}
          {profileSaveStatus === 'error' && (
            <p className="text-sm text-fp-danger font-medium">
              Failed to save. Check the username.
            </p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION: PROFILE PHOTO (existing — unchanged)
      ══════════════════════════════════════════════════════════════════════ */}
      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="bg-fp-surface border border-fp-border rounded-xl p-5">
          <p className="text-fp-text-secondary text-[10px] font-bold uppercase tracking-widest mb-5">
            Profile Photo
          </p>

          <div className="flex items-center gap-5">
            <div className="shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile photo"
                  className="w-20 h-20 rounded-full object-cover border-2 border-fp-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-2 border-fp-border bg-fp-accent-muted flex items-center justify-center">
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
              <p className="text-fp-text-tertiary text-xs mt-2">
                JPG, PNG or WebP. Cropped to a square.
              </p>
            </div>
          </div>
        </div>

        {/* ── SECTION: PROFILE INFO (existing — unchanged) ── */}
        <div className="bg-fp-surface border border-fp-border rounded-xl p-5 space-y-5">
          <p className="text-fp-text-secondary text-[10px] font-bold uppercase tracking-widest">
            Profile Info
          </p>

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
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full bg-fp-base border border-fp-border text-fp-text-tertiary text-sm rounded-lg px-3 py-2.5 cursor-not-allowed opacity-60"
            />
            <p className="text-fp-text-tertiary text-[10px] mt-1">
              Email cannot be changed here.
            </p>
          </div>

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
              className={inputClass}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-fp-text-tertiary text-[10px]">Shown on your client portal.</p>
              <p className={`text-[10px] font-medium ${bio.length > 100 ? 'text-fp-warning' : 'text-fp-text-tertiary'}`}>
                {bio.length}/120
              </p>
            </div>
          </div>

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
                className={`${inputClass} pr-10`}
              />
              {portfolioUrl && (
                
                <a href={portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fp-text-tertiary hover:text-fp-accent transition-colors duration-150"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── PORTAL PREVIEW (existing — unchanged) ── */}
        <div className="bg-fp-surface border border-fp-border rounded-xl p-5">
          <p className="text-fp-text-tertiary text-[10px] font-bold uppercase tracking-widest mb-4">
            Client Portal Preview
          </p>
          <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-fp-portal-text-tertiary mb-3">
              Your Developer
            </p>
            <div className="flex items-center gap-3">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={name}
                  className="w-10 h-10 rounded-full object-cover border border-fp-portal-border shrink-0"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center border border-fp-portal-border bg-fp-portal-raised text-sm font-bold"
                  style={{ color: 'var(--color-fp-portal-accent)' }}
                >
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
              <div
                className="flex items-center gap-1.5 mt-3 text-xs font-medium"
                style={{ color: 'var(--color-fp-portal-accent)' }}
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">{portfolioUrl.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
          </div>
          <p className="text-fp-text-tertiary text-[10px] mt-2.5 leading-relaxed">
            This is what your client sees when they open their portal.
          </p>
        </div>

        {/* Flow 2 save button */}
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
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : 'Save Changes'
            }
          </button>
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-fp-success font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </div>
          )}
        </div>

      </form>
    </div>
  )
}