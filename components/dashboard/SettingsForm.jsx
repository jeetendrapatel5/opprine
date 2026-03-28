// components/dashboard/SettingsForm.jsx
'use client'

import { useState, useRef } from 'react'
import { Loader2, Upload, ExternalLink, CheckCircle2 } from 'lucide-react'
import axios from 'axios'

// Props:
//   user — the current user object from the server
//          shape: { id, name, email, bio, avatarUrl, portfolioUrl }

export default function SettingsForm({ user }) {
  const [name,         setName]         = useState(user.name         ?? '')
  const [bio,          setBio]          = useState(user.bio          ?? '')
  const [portfolioUrl, setPortfolioUrl] = useState(user.portfolioUrl ?? '')

  // avatarPreview — what shows in the preview circle.
  // Starts from the saved Cloudinary URL, updates immediately when
  // the user picks a new file using URL.createObjectURL().
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl ?? null)
  const [avatarFile,    setAvatarFile]    = useState(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saved,        setSaved]        = useState(false)

  const fileInputRef = useRef(null)

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    // createObjectURL creates a temporary local URL for the file
    // so we can show a preview immediately without uploading yet
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSaved(false)

    try {
      if (avatarFile) {
        // If there's a new avatar, use multipart/form-data
        const formData = new FormData()
        formData.append('name',         name.trim())
        formData.append('bio',          bio.trim())
        formData.append('portfolioUrl', portfolioUrl.trim())
        formData.append('avatar',       avatarFile)

        await axios.patch('/api/settings', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        // No new avatar — plain JSON update
        await axios.patch('/api/settings', {
          name:         name.trim(),
          bio:          bio.trim(),
          portfolioUrl: portfolioUrl.trim(),
        })
      }

      setSaved(true)
      setAvatarFile(null)
      // Clear the saved confirmation after 3 seconds
      setTimeout(() => setSaved(false), 3000)

    } catch (error) {
      const message = error.response?.data?.error ?? 'Failed to save settings.'
      alert(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Avatar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Profile Photo</h2>

        <div className="flex items-center gap-5">
          {/* Avatar preview circle */}
          <div className="relative w-20 h-20 shrink-0">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile photo"
                className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
              />
            ) : (
              // Placeholder initials when no photo is set
              <div className="w-20 h-20 rounded-full bg-indigo-100 border-2 border-slate-200 flex items-center justify-center">
                <span className="text-xl font-bold text-indigo-600">
                  {name.charAt(0).toUpperCase()}
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
              className="flex items-center gap-2 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors"
            >
              <Upload className="w-4 h-4" />
              {avatarPreview ? 'Change photo' : 'Upload photo'}
            </button>
            <p className="text-xs text-slate-400 mt-2">
              JPG, PNG or WebP. Will be cropped to a square.
            </p>
          </div>
        </div>
      </div>

      {/* ── Profile info ── */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-5">
        <h2 className="text-sm font-bold text-slate-900">Profile Info</h2>

        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jeetu Patel"
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            required
          />
        </div>

        {/* Email — read only */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-400 cursor-not-allowed"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Email cannot be changed here.
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
            One-line Bio <span className="text-slate-400 normal-case font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Full-stack developer based in Goa, India"
            maxLength={120}
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            {bio.length}/120 characters. Shown on your client portal.
          </p>
        </div>

        {/* Portfolio URL */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
            Portfolio URL <span className="text-slate-400 normal-case font-normal">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 pr-10"
            />
            {/* Preview link — shown when a URL is entered */}
            {portfolioUrl && (
              
               <a href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Preview"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Submit ── */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {isSubmitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            : 'Save Changes'
          }
        </button>

        {/* Success confirmation — appears briefly after saving */}
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Saved successfully
          </div>
        )}
      </div>

    </form>
  )
}