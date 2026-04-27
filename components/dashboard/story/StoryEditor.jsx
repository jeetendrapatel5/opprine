// components/dashboard/story/StoryEditor.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The two-column story editor.
//
// LEFT column — settings panel with four sections:
//   1. Publish Settings — enable/disable toggle, slug input
//   2. Cover Image — upload or auto-select from milestones
//   3. The Project — industry, tech stack, hide client toggle
//   4. Your Story — problem and outcome narratives
//
// RIGHT column — live preview panel.
//   Updates in real time as the freelancer types.
//   Renders a compact version of what /showcase/[slug] will look like.
//   NOT an iframe — it's a React component rendering local state.
//
// Save pattern:
//   Every section change updates local state immediately (instant UI feedback).
//   The freelancer clicks "Save changes" to persist — one PATCH request.
//   The save button shows "Saving..." then "Saved ✓" for 2 seconds.
//
// Cover image upload pattern:
//   File pick → POST to cover route → get URL back → store in local state.
//   The URL is sent as a plain string in the story save JSON.
//   This keeps the story PATCH route simple (JSON only, no multipart).
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState, useRef } from 'react'
import {
  Loader2, CheckCircle2, Copy, Check, ExternalLink,
  Upload, X, Plus, Star, ImageIcon, Globe, Eye, EyeOff,
} from 'lucide-react'
import axios from 'axios'

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_TECH_TAGS  = 12
const MAX_NARRATIVE  = 600

const INDUSTRY_OPTIONS = [
  'E-commerce',
  'SaaS',
  'Healthcare',
  'Education',
  'Real Estate',
  'Finance',
  'Agency / Brand',
  'Other',
]

// ── Small reusable pieces ─────────────────────────────────────────────────────

// SectionCard — wraps each settings section with consistent visual treatment.
// The title is in the fp- uppercase tracking style used throughout the dashboard.
function SectionCard({ title, children }) {
  return (
    <div className="bg-fp-surface border border-fp-border rounded-xl p-5 space-y-4">
      <p className="text-fp-text-secondary text-[10px] font-bold uppercase tracking-widest">
        {title}
      </p>
      {children}
    </div>
  )
}

// Toggle — a styled boolean switch.
// Why not a checkbox: checkboxes are hard to style consistently across browsers.
// A div-based toggle is visually precise and uses our fp- tokens exactly.
function Toggle({ enabled, onChange, label, helper }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-fp-text-primary text-sm font-medium leading-snug">
          {label}
        </p>
        {helper && (
          <p className="text-fp-text-tertiary text-xs mt-0.5 leading-relaxed">
            {helper}
          </p>
        )}
      </div>
      {/* The button acts as the toggle — accessible via keyboard */}
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`
          relative shrink-0 w-10 h-5.5 rounded-full transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-fp-accent/30
          ${enabled ? 'bg-fp-accent' : 'bg-fp-border'}
        `}
        style={{ height: '22px' }}
        aria-pressed={enabled}
      >
        {/* The sliding knob */}
        <span
          className={`
            absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm
            transition-transform duration-200
            ${enabled ? 'translate-x-[18px]' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  )
}

// TechTagInput — tag-style input for the tech stack.
// Press Enter or comma to add a tag. Backspace on empty input removes the last tag.
// Max MAX_TECH_TAGS tags.
function TechTagInput({ tags, onChange }) {
  const [inputValue, setInputValue] = useState('')

  const addTag = (raw) => {
    const value = raw.trim().replace(/,+$/, '').trim()
    if (!value)                     return
    if (tags.length >= MAX_TECH_TAGS) return
    if (tags.includes(value))       return  // no duplicates
    onChange([...tags, value])
  }

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e) => {
    // Enter or comma → add the current input as a tag
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
      setInputValue('')
    }
    // Backspace on empty input → remove the last tag
    if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue)
      setInputValue('')
    }
  }

  return (
    <div>
      {/* Tag display + input field — all inside one container */}
      <div className="
        flex flex-wrap gap-1.5 min-h-[42px]
        bg-fp-base border border-fp-border rounded-lg px-3 py-2
        focus-within:ring-2 focus-within:ring-fp-accent/30 focus-within:border-fp-accent/50
        transition-colors duration-150 cursor-text
      "
        onClick={(e) => {
          // Clicking anywhere in the container focuses the text input
          e.currentTarget.querySelector('input')?.focus()
        }}
      >
        {/* Rendered tags */}
        {tags.map((tag, index) => (
          <span
            key={index}
            className="
              inline-flex items-center gap-1 px-2 py-0.5
              bg-fp-accent-muted text-fp-accent text-xs font-medium rounded-md
              border border-fp-accent/20
            "
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(index) }}
              className="text-fp-accent/60 hover:text-fp-accent transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}

        {/* Text input — grows to fill remaining space */}
        {tags.length < MAX_TECH_TAGS && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={tags.length === 0 ? 'e.g. Next.js, PostgreSQL, Stripe' : 'Add more...'}
            className="
              flex-1 min-w-[100px] bg-transparent text-fp-text-primary text-sm
              placeholder:text-fp-text-tertiary outline-none
            "
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-1">
        <p className="text-fp-text-tertiary text-[10px]">
          Press Enter or comma to add. Press Backspace to remove the last one.
        </p>
        <p className={`text-[10px] font-medium ${
          tags.length >= MAX_TECH_TAGS ? 'text-fp-warning' : 'text-fp-text-tertiary'
        }`}>
          {tags.length} / {MAX_TECH_TAGS}
        </p>
      </div>
    </div>
  )
}

// CharCount — shows remaining characters below a textarea.
function CharCount({ current, max }) {
  const remaining = max - current
  const isNearLimit = remaining < 80
  return (
    <p className={`text-[10px] font-medium text-right mt-1 ${
      isNearLimit ? 'text-fp-warning' : 'text-fp-text-tertiary'
    }`}>
      {current} / {max}
    </p>
  )
}

// ── Live preview ──────────────────────────────────────────────────────────────
// Compact read-only preview of the public showcase page.
// Renders inside the right column of the editor.
// All data comes from the parent's local state — updates instantly as the
// freelancer types.

function LivePreview({ data, project }) {
  const {
    caseStudyEnabled,
    publicSlug,
    caseStudyCoverImage,
    caseStudyIndustry,
    caseStudyTechStack,
    caseStudyHideClient,
    caseStudyProblem,
    caseStudyOutcome,
  } = data

  // Determine the hero image:
  // 1. Use the explicit cover image if set
  // 2. Otherwise use the first completed milestone's delivery image
  // 3. Otherwise use the first project file that is an image
  const autoHeroImage = (() => {
    for (const m of project.milestones) {
      if (m.deliveryFileUrl && m.deliveryFileType?.startsWith('image/')) {
        return m.deliveryFileUrl
      }
    }
    const imgFile = project.files.find(f => f.fileType?.startsWith('image/'))
    return imgFile?.url ?? null
  })()

  const heroImage  = caseStudyCoverImage || autoHeroImage
  const clientName = caseStudyHideClient
    ? 'A satisfied client'
    : (project.client?.name ?? 'A satisfied client')

  return (
    <div className="
      bg-white rounded-xl border border-fp-border overflow-hidden
      text-gray-900 text-sm
    ">
      {/* Mini browser chrome — makes it feel like a real page preview */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
        </div>
        <div className="flex-1 bg-gray-100 rounded-md px-2.5 py-1 text-[10px] text-gray-400 truncate font-mono">
          {publicSlug
            ? `freeport.app/showcase/${publicSlug}`
            : 'freeport.app/showcase/your-project-name'
          }
        </div>
      </div>

      {/* Preview content — scrollable */}
      <div className="overflow-y-auto max-h-[600px]">

        {/* Hero image */}
        {heroImage ? (
          <div className="w-full h-36 bg-gray-100 overflow-hidden">
            <img
              src={heroImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-36 bg-fp-raised flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="w-6 h-6 text-fp-border mx-auto mb-1" />
              <p className="text-fp-text-tertiary text-[10px]">
                Cover image will appear here
              </p>
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">

          {/* Project name + badges */}
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                ✓ Completed Project
              </span>
              {caseStudyIndustry && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {caseStudyIndustry}
                </span>
              )}
            </div>
            <h1 className="font-bold text-base text-gray-900 leading-snug">
              {project.name}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              by {project.user.name} · for {clientName}
            </p>
          </div>

          {/* Tech stack badges */}
          {caseStudyTechStack.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {caseStudyTechStack.map((tech, i) => (
                <span
                  key={i}
                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          {/* Testimonial */}
          {project.testimonial && (
            <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3">
              <div className="flex gap-0.5 mb-1.5">
                {[1,2,3,4,5].map(s => (
                  <Star
                    key={s}
                    className="w-3 h-3"
                    fill={s <= (project.clientRating ?? 5) ? '#B07633' : 'transparent'}
                    color={s <= (project.clientRating ?? 5) ? '#B07633' : '#d1d5db'}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-700 italic leading-relaxed line-clamp-3">
                "{project.testimonial}"
              </p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-1.5">
                — {clientName}
              </p>
            </div>
          )}

          {/* Problem */}
          {caseStudyProblem ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                The Challenge
              </p>
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
                {caseStudyProblem}
              </p>
            </div>
          ) : (
            <div className="border border-dashed border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 text-center">
                The Challenge will appear here
              </p>
            </div>
          )}

          {/* Outcome */}
          {caseStudyOutcome ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                The Outcome
              </p>
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
                {caseStudyOutcome}
              </p>
            </div>
          ) : (
            <div className="border border-dashed border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 text-center">
                The Outcome will appear here
              </p>
            </div>
          )}

          {/* Milestones */}
          {project.milestones.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                How We Got There
              </p>
              <div className="space-y-1.5">
                {project.milestones.slice(0, 4).map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-700 truncate">{m.title}</p>
                  </div>
                ))}
                {project.milestones.length > 4 && (
                  <p className="text-[10px] text-gray-400 pl-6">
                    +{project.milestones.length - 4} more milestones
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer — not published notice or "looks good" */}
      <div className={`
        px-4 py-2.5 border-t text-center text-[10px] font-semibold
        ${caseStudyEnabled
          ? 'bg-green-50 border-green-100 text-green-700'
          : 'bg-fp-raised border-fp-border text-fp-text-tertiary'
        }
      `}>
        {caseStudyEnabled
          ? '✓ This story is public'
          : 'Enable the toggle to publish this story'
        }
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StoryEditor({ project }) {

  // ── Form state ─────────────────────────────────────────────────────────────
  // Initialize from the project prop. All fields update locally as the
  // freelancer types — nothing saves until they click "Save changes".

  const [caseStudyEnabled,    setCaseStudyEnabled]    = useState(project.caseStudyEnabled    ?? false)
  const [publicSlug,          setPublicSlug]          = useState(project.publicSlug          ?? '')
  const [caseStudyCoverImage, setCaseStudyCoverImage] = useState(project.caseStudyCoverImage ?? null)
  const [caseStudyIndustry,   setCaseStudyIndustry]   = useState(project.caseStudyIndustry   ?? '')
  const [caseStudyTechStack,  setCaseStudyTechStack]  = useState(project.caseStudyTechStack  ?? [])
  const [caseStudyHideClient, setCaseStudyHideClient] = useState(project.caseStudyHideClient ?? true)
  const [caseStudyProblem,    setCaseStudyProblem]    = useState(project.caseStudyProblem    ?? '')
  const [caseStudyOutcome,    setCaseStudyOutcome]    = useState(project.caseStudyOutcome    ?? '')

  // ── UI state ───────────────────────────────────────────────────────────────
  const [isSaving,       setIsSaving]       = useState(false)
  const [saveStatus,     setSaveStatus]     = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [slugError,      setSlugError]      = useState('')
  const [isCoverUploading, setIsCoverUploading] = useState(false)
  const [isSlugCopied,   setIsSlugCopied]   = useState(false)

  const coverInputRef = useRef(null)

  // ── Slug validation ────────────────────────────────────────────────────────
  const handleSlugChange = (value) => {
    // Force lowercase and replace spaces with hyphens as the freelancer types
    const cleaned = value.toLowerCase().replace(/\s+/g, '-')
    setPublicSlug(cleaned)

    if (cleaned && !/^[a-z0-9-]+$/.test(cleaned)) {
      setSlugError('Only lowercase letters, numbers, and hyphens.')
    } else {
      setSlugError('')
    }
  }

  // ── Cover image upload ─────────────────────────────────────────────────────
  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset input so same file can be re-selected

    setIsCoverUploading(true)
    try {
      const formData = new FormData()
      formData.append('cover', file)

      const response = await axios.post(
        `/api/projects/${project.id}/story/cover`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      // Store the URL in local state — it will be saved with the form
      setCaseStudyCoverImage(response.data.url)
    } catch {
      alert('Failed to upload cover image. Please try again.')
    } finally {
      setIsCoverUploading(false)
    }
  }

  const removeCoverImage = () => {
    setCaseStudyCoverImage(null)
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (slugError) return

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      await axios.patch(`/api/projects/${project.id}/story`, {
        caseStudyEnabled,
        publicSlug:          publicSlug || null,
        caseStudyCoverImage: caseStudyCoverImage || null,
        caseStudyIndustry:   caseStudyIndustry  || null,
        caseStudyTechStack,
        caseStudyHideClient,
        caseStudyProblem:    caseStudyProblem   || null,
        caseStudyOutcome:    caseStudyOutcome   || null,
        // Mark the project as public when the story is enabled.
        // isPublic controls whether /showcase/[slug] is accessible at all.
        // We also make sure publicSlug is set if it isn't already.
      })

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)

    } catch (error) {
      const message = error.response?.data?.error
      if (message?.includes('slug')) {
        setSlugError(message)
      }
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Copy slug URL ──────────────────────────────────────────────────────────
  const handleCopySlugUrl = () => {
    const url = `${window.location.origin}/showcase/${publicSlug}`
    navigator.clipboard.writeText(url)
    setIsSlugCopied(true)
    setTimeout(() => setIsSlugCopied(false), 2000)
  }

  // ── Shared input class ─────────────────────────────────────────────────────
  const inputClass = `
    w-full bg-fp-base border border-fp-border text-fp-text-primary
    text-sm rounded-lg px-3 py-2.5
    placeholder:text-fp-text-tertiary
    focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
    transition-colors duration-150
  `

  // ── Local state snapshot for the preview ───────────────────────────────────
  // Passed as a single object so LivePreview doesn't need a dozen props
  const previewData = {
    caseStudyEnabled,
    publicSlug,
    caseStudyCoverImage,
    caseStudyIndustry,
    caseStudyTechStack,
    caseStudyHideClient,
    caseStudyProblem,
    caseStudyOutcome,
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* ════════════════════════════════════════════════════════
          LEFT COLUMN — Settings panel
      ════════════════════════════════════════════════════════ */}
      <div className="space-y-4">

        {/* ── Section 1: Publish Settings ── */}
        <SectionCard title="Publish Settings">

          {/* Enable toggle */}
          <Toggle
            enabled={caseStudyEnabled}
            onChange={setCaseStudyEnabled}
            label="Enable Project Story"
            helper={
              caseStudyEnabled
                ? 'Your story is live. Anyone with the link can view it.'
                : 'Turn this on to make your story public.'
            }
          />

          {/* URL slug input — shown regardless of enabled state so the
              freelancer can set it up before publishing */}
          <div>
            <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
              Your URL
            </label>

            {/* Prefix + input side by side */}
            <div className="flex rounded-lg overflow-hidden border border-fp-border focus-within:ring-2 focus-within:ring-fp-accent/30 focus-within:border-fp-accent/50 transition-colors duration-150">
              {/* Non-editable prefix */}
              <span className="
                flex items-center px-3 bg-fp-raised
                text-fp-text-tertiary text-xs font-mono border-r border-fp-border
                whitespace-nowrap shrink-0
              ">
                /showcase/
              </span>
              {/* Editable slug part */}
              <input
                type="text"
                value={publicSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="your-project-name"
                className="
                  flex-1 bg-fp-base text-fp-text-primary text-sm px-3 py-2.5
                  placeholder:text-fp-text-tertiary outline-none min-w-0
                "
              />
            </div>

            {/* Validation error */}
            {slugError && (
              <p className="text-fp-danger text-[10px] mt-1">{slugError}</p>
            )}

            {/* Live URL + copy button — only shown when slug + enabled */}
            {caseStudyEnabled && publicSlug && !slugError && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-fp-raised border border-fp-border rounded-lg">
                <Globe className="w-3 h-3 text-fp-accent shrink-0" />
                <span className="text-[10px] text-fp-text-secondary font-mono truncate flex-1">
                  /showcase/{publicSlug}
                </span>
                <button
                  type="button"
                  onClick={handleCopySlugUrl}
                  className="text-fp-text-tertiary hover:text-fp-accent transition-colors shrink-0"
                >
                  {isSlugCopied
                    ? <Check className="w-3 h-3 text-fp-success" />
                    : <Copy  className="w-3 h-3" />
                  }
                </button>
                
                <a href={`/showcase/${publicSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fp-text-tertiary hover:text-fp-accent transition-colors shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

        </SectionCard>

        {/* ── Section 2: Cover Image ── */}
        <SectionCard title="Cover Image">

          {caseStudyCoverImage ? (
            // Cover is set — show thumbnail + remove option
            <div>
              <div className="relative rounded-lg overflow-hidden border border-fp-border">
                <img
                  src={caseStudyCoverImage}
                  alt="Cover preview"
                  className="w-full h-32 object-cover"
                />
                {/* Remove button — top right corner */}
                <button
                  type="button"
                  onClick={removeCoverImage}
                  className="
                    absolute top-2 right-2
                    bg-black/50 hover:bg-black/70 text-white
                    rounded-full p-1 transition-colors duration-150
                  "
                  title="Remove cover image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Allow re-uploading a different image */}
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={isCoverUploading}
                className="
                  mt-2 flex items-center gap-2 text-xs text-fp-text-tertiary
                  hover:text-fp-accent transition-colors duration-150
                  disabled:opacity-50
                "
              >
                <Upload className="w-3 h-3" />
                Replace image
              </button>
            </div>
          ) : (
            // No cover — show upload button
            <div>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={isCoverUploading}
                className="
                  w-full flex flex-col items-center gap-2 py-6
                  border border-dashed border-fp-border rounded-lg
                  text-fp-text-tertiary hover:text-fp-accent hover:border-fp-accent/30
                  transition-colors duration-150 disabled:opacity-50
                "
              >
                {isCoverUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-fp-accent" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                <span className="text-xs font-medium">
                  {isCoverUploading ? 'Uploading...' : 'Upload cover image'}
                </span>
              </button>
              <p className="text-fp-text-tertiary text-[10px] mt-2 leading-relaxed">
                If left empty, we'll use your first milestone delivery image as the hero.
              </p>
            </div>
          )}

          {/* Hidden file input */}
          <input
            type="file"
            ref={coverInputRef}
            onChange={handleCoverFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

        </SectionCard>

        {/* ── Section 3: The Project ── */}
        <SectionCard title="The Project">

          {/* Industry dropdown */}
          <div>
            <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
              Industry
              <span className="text-fp-text-tertiary font-normal ml-1">(optional)</span>
            </label>
            <select
              value={caseStudyIndustry}
              onChange={(e) => setCaseStudyIndustry(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Select an industry...</option>
              {INDUSTRY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Tech stack */}
          <div>
            <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
              Tech Stack
              <span className="text-fp-text-tertiary font-normal ml-1">(optional)</span>
            </label>
            <TechTagInput
              tags={caseStudyTechStack}
              onChange={setCaseStudyTechStack}
            />
          </div>

          {/* Hide client name toggle */}
          <Toggle
            enabled={caseStudyHideClient}
            onChange={setCaseStudyHideClient}
            label="Hide client name"
            helper={
              caseStudyHideClient
                ? 'Showing "A satisfied client" — toggle off to show their real name.'
                : `Showing "${project.client?.name ?? 'client name'}". Toggle on for privacy.`
            }
          />

        </SectionCard>

        {/* ── Section 4: Your Story ── */}
        <SectionCard title="Your Story">

          {/* The Challenge */}
          <div>
            <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
              The Challenge
            </label>
            <textarea
              value={caseStudyProblem}
              onChange={(e) => setCaseStudyProblem(e.target.value.slice(0, MAX_NARRATIVE))}
              rows={4}
              placeholder="What was the client's situation before this project? What problem were they trying to solve? Write 2–4 sentences in plain English — no jargon."
              className={`${inputClass} resize-none`}
            />
            <CharCount current={caseStudyProblem.length} max={MAX_NARRATIVE} />
          </div>

          {/* The Outcome */}
          <div>
            <label className="block text-fp-text-secondary text-xs font-semibold mb-1.5">
              The Outcome
            </label>
            <textarea
              value={caseStudyOutcome}
              onChange={(e) => setCaseStudyOutcome(e.target.value.slice(0, MAX_NARRATIVE))}
              rows={4}
              placeholder="What changed after you delivered? What can the client do now that they couldn't before? If you have specific numbers, use them — they are the most persuasive part of any case study."
              className={`${inputClass} resize-none`}
            />
            <CharCount current={caseStudyOutcome.length} max={MAX_NARRATIVE} />
          </div>

        </SectionCard>

        {/* ── Save button ── */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !!slugError}
            className="
              flex items-center gap-2
              bg-fp-accent hover:bg-fp-accent-hover text-fp-base
              text-sm font-semibold px-6 py-2.5 rounded-lg
              transition-colors duration-150 disabled:opacity-50
            "
          >
            {isSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : 'Save changes'
            }
          </button>

          {/* Status feedback — brief, non-disruptive */}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 text-sm text-fp-success font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </div>
          )}
          {saveStatus === 'error' && (
            <p className="text-sm text-fp-danger font-medium">
              Failed to save. Check the URL slug.
            </p>
          )}
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════
          RIGHT COLUMN — Live preview panel
      ════════════════════════════════════════════════════════ */}
      <div className="lg:sticky lg:top-6">

        {/* Panel header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-fp-text-secondary text-[10px] font-bold uppercase tracking-widest">
            Live Preview
          </p>
          {caseStudyEnabled && publicSlug && (
            
            <a href={`/showcase/${publicSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex items-center gap-1 text-xs text-fp-accent
                hover:text-fp-accent-hover transition-colors duration-150
              "
            >
              Open →
            </a>
          )}
        </div>

        {/* The preview component — receives local state, updates live */}
        <LivePreview data={previewData} project={project} />

        {/* Hint below the preview */}
        <p className="text-fp-text-tertiary text-[10px] mt-3 leading-relaxed text-center">
          Preview updates as you type. Click "Save changes" to persist.
        </p>

      </div>
    </div>
  )
}