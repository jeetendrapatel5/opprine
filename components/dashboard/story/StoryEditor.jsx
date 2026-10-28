'use client'

/* eslint-disable @next/next/no-img-element --
   The cover image is a user-supplied URL (Cloudinary), so next/image's fixed
   remote-host allow-list does not fit here. */

// components/dashboard/story/StoryEditor.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The Project Story editor: settings on the left, live preview on the right.
//
// Files in this folder
//   StoryEditor.jsx   (this file) state, saving, cover upload, page layout
//   StoryFields.jsx   form building blocks (Section, Field, Toggle, TagInput…)
//   StoryPreview.jsx  the read-only mock of the public page
//   story-config.js   constants + pure helpers (form <-> API shape)
//
// How data flows
//   1. The server page loads the project and passes it in as `project`.
//   2. `form` holds what is on screen. `saved` holds what is in the database.
//      Every keystroke changes `form` only.
//   3. "Unsaved changes" is simply form !== saved.
//   4. Save sends ONE PATCH with the form values. On success, `saved` is set
//      to the values that were sent, so the page goes back to "all saved".
//   5. A cover image is uploaded the moment it is picked (POST to the cover
//      route). The returned URL goes into `form` and is stored on Save, so the
//      story PATCH stays plain JSON.
//
// Layout
//   xl and wider  — editor and preview side by side.
//   below xl      — one at a time, switched with an Editor/Preview control.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import axios from 'axios'
import {
  Check, CheckCircle2, ChevronDown, Copy, ExternalLink,
  Globe, Loader2, Upload, X,
} from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import StoryPreview from './StoryPreview'
import {
  Section, Field, Counter, Toggle, NarrativeField, TagInput,
  buttonStyles, controlSurface, inputClass,
} from './StoryFields'
import {
  MAX_TECH_TAGS, MAX_NARRATIVE, SLUG_PATTERN, INDUSTRY_OPTIONS,
  toFormValues, toPayload, getAutoHeroImage,
} from './story-config'

const VIEWS = [
  { id: 'editor',  label: 'Editor'  },
  { id: 'preview', label: 'Preview' },
]

// ── Small helpers ─────────────────────────────────────────────────────────────

// Reads the site's host name (e.g. "opprine.vercel.app") in the browser.
// useSyncExternalStore gives "" on the server and the real value after
// hydration, so server and client HTML always match.
const subscribeNoop = () => () => {}
const getHost       = () => window.location.host
const getServerHost = () => ''

// A true/false flag that switches itself off after `ms` milliseconds.
// Used for the "Saved" and "Copied" confirmations. The timer is cleared if the
// component unmounts or the flag is set again.
function useFlash(ms) {
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (!on) return
    const timer = setTimeout(() => setOn(false), ms)
    return () => clearTimeout(timer)
  }, [on, ms])

  return [on, setOn]
}

// Helper text under the "Enable Project Story" switch. It compares what is on
// screen with what is saved, so it never claims the story is live before the
// freelancer has actually saved.
function getPublishHelper(formEnabled, savedEnabled) {
  if (formEnabled === savedEnabled) {
    return formEnabled
      ? 'Live. Anyone with the link can view it.'
      : 'Turn this on to make your story public.'
  }
  return formEnabled ? 'Will go live when you save.' : 'Will go offline when you save.'
}

// Industry picker. A shadcn DropdownMenu in place of the native <select>, so the
// open list matches the dashboard theme instead of the browser's default one.
//
//  - `fp-dark-popover` (globals.css) re-maps the shadcn tokens to the dark
//    dashboard palette. The menu renders in a portal, so the class has to sit
//    on the content element itself.
//  - The list is as wide as the trigger (--radix-dropdown-menu-trigger-width),
//    so it fits any screen size, and it scrolls if the screen is short.
//  - Radix handles arrow keys, Home/End, type-to-select, Escape and focus
//    return. Radio items announce the selected option to screen readers.
//  - The chosen value is stored as a plain string, exactly as before.
function IndustrySelect({ id, value, onChange, options }) {
  return (
    // modal={false}: by default Radix locks page scroll while a menu is open,
    // which removes the page scrollbar and leaves a gap on the right that shows
    // the (white) body background. Non-modal keeps the page exactly as it is;
    // Escape, outside click and focus return to the trigger still work.
    <DropdownMenu modal={false}>
      <div className="relative">
        <DropdownMenuTrigger asChild>
          <button
            id={id}
            type="button"
            className={`${inputClass} peer cursor-pointer pr-9 text-left data-[state=open]:border-fp-accent/60 data-[state=open]:ring-2 data-[state=open]:ring-fp-accent/30`}
          >
            <span className={`block truncate ${value ? '' : 'text-fp-text-tertiary'}`}>
              {value || 'Select an industry'}
            </span>
          </button>
        </DropdownMenuTrigger>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fp-text-secondary transition-transform duration-200 peer-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </div>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className={
          'fp-dark-popover max-h-[min(18rem,var(--radix-dropdown-menu-content-available-height))] w-(--radix-dropdown-menu-trigger-width) overscroll-contain rounded-lg border-fp-text-tertiary/30 p-1.5 shadow-xl shadow-black/40 ' +
          // Slim scrollbar: Firefox and current Chrome/Edge use the standard
          // properties, older Safari falls back to the -webkit- rules.
          '[scrollbar-width:thin] [scrollbar-color:var(--color-fp-text-tertiary)_transparent] ' +
          '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ' +
          '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-fp-text-tertiary/60 ' +
          '[&::-webkit-scrollbar-thumb:hover]:bg-fp-text-secondary'
        }
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          <DropdownMenuRadioItem
            value=""
            className="cursor-pointer rounded-md py-2 pl-2.5 pr-8 text-fp-text-secondary [&>span:first-child]:hidden"
          >
            No industry
          </DropdownMenuRadioItem>

          <DropdownMenuSeparator className="my-1.5 bg-fp-text-tertiary/30" />

          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              className="cursor-pointer rounded-md py-2 pl-2.5 pr-8 text-fp-text-primary transition-colors duration-150 data-[state=checked]:bg-fp-accent-muted/60 data-[state=checked]:font-medium [&>span:first-child]:hidden"
            >
              {option}
              {value === option && (
                <Check
                  className="absolute right-2.5 size-4 text-fp-accent"
                  aria-hidden="true"
                />
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// "Live" / "Draft" pill shown in the Publish settings header.
function StatusBadge({ isLive }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-fp-border bg-fp-base px-2.5 py-1 text-xs font-medium text-fp-text-primary">
      <span
        className={`size-1.5 rounded-full ${isLive ? 'bg-fp-success' : 'bg-fp-text-tertiary'}`}
        aria-hidden="true"
      />
      {isLive ? 'Live' : 'Draft'}
    </span>
  )
}

// The message on the left of the save bar. One message at a time, in priority
// order: error → saving → unsaved → just saved → nothing to save.
function SaveStatus({ error, isSaving, isDirty, justSaved }) {
  if (error) {
    return <span className="text-fp-danger">{error}</span>
  }
  if (isSaving) {
    return <span className="text-fp-text-secondary">Saving…</span>
  }
  if (isDirty) {
    return (
      <span className="flex items-center gap-2 text-fp-text-primary">
        <span className="size-1.5 rounded-full bg-fp-warning" aria-hidden="true" />
        Unsaved changes
      </span>
    )
  }
  if (justSaved) {
    return (
      <span className="flex items-center gap-1.5 text-fp-success">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Changes saved
      </span>
    )
  }
  return <span className="text-fp-text-secondary">All changes saved</span>
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StoryEditor({ project }) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [form,  setForm]  = useState(() => toFormValues(project)) // what is on screen
  const [saved, setSaved] = useState(form)                        // what is in the database

  const [isSaving,         setIsSaving]         = useState(false)
  const [saveError,        setSaveError]        = useState('')
  const [serverSlugError,  setServerSlugError]  = useState('')   // e.g. "slug already taken"
  const [isCoverUploading, setIsCoverUploading] = useState(false)
  const [coverError,       setCoverError]       = useState('')
  const [justSaved,  setJustSaved]  = useFlash(2000)
  const [linkCopied, setLinkCopied] = useFlash(2000)
  const [view, setView] = useState('editor')                      // only used below xl

  const coverInputRef = useRef(null)
  const host = useSyncExternalStore(subscribeNoop, getHost, getServerHost)

  // ── Derived values (computed on every render, never stored) ────────────────
  const autoHeroImage = useMemo(() => getAutoHeroImage(project), [project])

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved)

  // The format rule is checked right here; the server's rule (uniqueness) is
  // stored separately and shown if the server rejects the slug.
  const formatSlugError =
    form.publicSlug && !SLUG_PATTERN.test(form.publicSlug)
      ? 'Only lowercase letters, numbers, and hyphens.'
      : ''
  const slugError = formatSlugError || serverSlugError

  // "Live" means the SAVED version is enabled and has a URL.
  const isLive = saved.caseStudyEnabled && Boolean(saved.publicSlug)

  // ── Form updates ───────────────────────────────────────────────────────────
  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaveError('') // an old error no longer applies once they edit
  }

  // Force lowercase and turn spaces into hyphens as the freelancer types.
  const handleSlugChange = (value) => {
    setServerSlugError('')
    update('publicSlug', value.toLowerCase().replace(/\s+/g, '-'))
  }

  // ── Cover image upload ─────────────────────────────────────────────────────
  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // lets the same file be picked again later

    setIsCoverUploading(true)
    setCoverError('')

    try {
      const formData = new FormData()
      formData.append('cover', file)

      const response = await axios.post(
        `/api/projects/${project.id}/story/cover`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      update('caseStudyCoverImage', response.data.url)
    } catch (error) {
      setCoverError(
        error.response?.data?.error ?? 'Could not upload the image. Please try again.'
      )
    } finally {
      setIsCoverUploading(false)
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (slugError || isSaving) return

    // Remember exactly what we send. If the freelancer keeps typing while the
    // request is in flight, those newer edits must stay "unsaved".
    const submitted = form

    setIsSaving(true)
    setSaveError('')

    try {
      await axios.patch(`/api/projects/${project.id}/story`, toPayload(submitted))
      setSaved(submitted)
      setServerSlugError('')
      setJustSaved(true)
    } catch (error) {
      const message = error.response?.data?.error
      if (message?.toLowerCase().includes('slug')) {
        setServerSlugError(message)
        setSaveError('Check your story URL and try again.')
      } else {
        setSaveError(message ?? 'Could not save your changes. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // ── Copy link ──────────────────────────────────────────────────────────────
  // Always copies the SAVED address, because that is the one that is live.
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/showcase/${saved.publicSlug}`
      )
      setLinkCopied(true)
    } catch {
      // Clipboard can be blocked (insecure page, denied permission).
      // Nothing useful to show, and the link is also visible to copy by hand.
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* Editor / Preview switch — only below xl, where there is no room for both */}
      <div className="mb-5 inline-flex rounded-full border border-fp-border bg-fp-surface p-1 xl:hidden">
        {VIEWS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => setView(id)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/50 ${
              view === id
                ? 'bg-fp-raised text-fp-text-primary'
                : 'text-fp-text-secondary hover:text-fp-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">

        {/* ═════════════ LEFT — settings ═════════════ */}
        <div className={`space-y-4 xl:col-span-3 ${view === 'preview' ? 'hidden xl:block' : ''}`}>

          {/* 1 — Publish settings */}
          <Section
            title="Publish settings"
            description="Choose whether this story is public and where it lives."
            aside={<StatusBadge isLive={isLive} />}
          >
            <Toggle
              enabled={form.caseStudyEnabled}
              onChange={(value) => update('caseStudyEnabled', value)}
              label="Enable Project Story"
              helper={getPublishHelper(form.caseStudyEnabled, saved.caseStudyEnabled)}
            />

            {/* The URL can be set up before publishing, so it is always shown */}
            <Field
              id="story-slug"
              label="Your URL"
              error={slugError}
              hint={
                form.caseStudyEnabled && !form.publicSlug
                  ? 'Choose a URL so your story can be shared.'
                  : 'Lowercase letters, numbers, and hyphens.'
              }
            >
              <div className={`${controlSurface} flex overflow-hidden`}>
                <span className="flex shrink-0 items-center whitespace-nowrap border-r border-fp-text-tertiary/30 bg-fp-raised px-3 text-xs text-fp-text-secondary">
                  /showcase/
                </span>
                <input
                  id="story-slug"
                  type="text"
                  value={form.publicSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="your-project-name"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-fp-text-primary outline-none placeholder:text-fp-text-tertiary"
                />
              </div>
            </Field>

            {/* Live link — only once the saved version is actually public */}
            {isLive && (
              <div className="flex flex-col gap-3 rounded-lg border border-fp-border bg-fp-base p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-fp-text-secondary">
                  <Globe className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{host}/showcase/{saved.publicSlug}</span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={handleCopyLink} className={buttonStyles.secondary}>
                    {linkCopied
                      ? <Check className="size-3.5 text-fp-success" aria-hidden="true" />
                      : <Copy className="size-3.5" aria-hidden="true" />}
                    {linkCopied ? 'Copied' : 'Copy link'}
                  </button>
                  <a
                    href={`/showcase/${saved.publicSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonStyles.secondary}
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    Open
                  </a>
                </div>
              </div>
            )}
          </Section>

          {/* 2 — Cover image */}
          <Section title="Cover image" description="The large image at the top of your story.">
            {form.caseStudyCoverImage ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-lg border border-fp-border bg-fp-base">
                  <img
                    src={form.caseStudyCoverImage}
                    alt="Cover preview"
                    className="aspect-video w-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isCoverUploading}
                    className={buttonStyles.secondary}
                  >
                    {isCoverUploading
                      ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      : <Upload className="size-3.5" aria-hidden="true" />}
                    {isCoverUploading ? 'Uploading…' : 'Replace image'}
                  </button>
                  <button
                    type="button"
                    onClick={() => update('caseStudyCoverImage', null)}
                    disabled={isCoverUploading}
                    className={buttonStyles.secondary}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isCoverUploading}
                  className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-fp-text-tertiary/40 py-8 text-fp-text-secondary transition-colors duration-150 hover:border-fp-accent/60 hover:text-fp-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  {isCoverUploading
                    ? <Loader2 className="size-5 animate-spin text-fp-accent" aria-hidden="true" />
                    : <Upload className="size-5" aria-hidden="true" />}
                  <span className="text-sm font-medium">
                    {isCoverUploading ? 'Uploading…' : 'Upload cover image'}
                  </span>
                </button>
                <p className="mt-2 text-xs leading-relaxed text-fp-text-secondary">
                  JPG, PNG, or WebP.{' '}
                  {autoHeroImage
                    ? 'Without one, we use your first milestone image.'
                    : 'Without one, your story has no hero image.'}
                </p>
              </div>
            )}

            {coverError && (
              <p role="alert" className="text-xs text-fp-danger">{coverError}</p>
            )}

            {/* Hidden picker, shared by "Upload" and "Replace" */}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverFileChange}
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
            />
          </Section>

          {/* 3 — The project */}
          <Section title="The project" description="Context that helps visitors place this work.">
            <Field id="story-industry" label="Industry" optional>
              <IndustrySelect
                id="story-industry"
                value={form.caseStudyIndustry ?? ''}
                onChange={(value) => update('caseStudyIndustry', value)}
                options={INDUSTRY_OPTIONS}
              />
            </Field>

            <Field
              id="story-tech"
              label="Tech stack"
              optional
              hint="Press Enter or comma to add."
              meta={<Counter current={form.caseStudyTechStack.length} max={MAX_TECH_TAGS} />}
            >
              <TagInput
                id="story-tech"
                tags={form.caseStudyTechStack}
                onChange={(tags) => update('caseStudyTechStack', tags)}
                max={MAX_TECH_TAGS}
                placeholder="e.g. Next.js, PostgreSQL, Stripe"
              />
            </Field>

            <Toggle
              enabled={form.caseStudyHideClient}
              onChange={(value) => update('caseStudyHideClient', value)}
              label="Hide client name"
              helper={
                form.caseStudyHideClient
                  ? 'Your client appears as “A satisfied client”.'
                  : `Your client appears as “${project.client?.name ?? 'A satisfied client'}”.`
              }
            />
          </Section>

          {/* 4 — The story itself */}
          <Section
            title="Your story"
            description="Two short paragraphs, in plain language. Specific numbers persuade most."
          >
            <NarrativeField
              id="story-problem"
              label="The challenge"
              value={form.caseStudyProblem}
              onChange={(value) => update('caseStudyProblem', value)}
              max={MAX_NARRATIVE}
              placeholder="What was the client's situation before this project? What problem were they trying to solve? Write 2–4 sentences in plain English, no jargon."
            />
            <NarrativeField
              id="story-outcome"
              label="The outcome"
              value={form.caseStudyOutcome}
              onChange={(value) => update('caseStudyOutcome', value)}
              max={MAX_NARRATIVE}
              placeholder="What changed after you delivered? What can the client do now that they couldn't before? Use specific numbers if you have them."
            />
          </Section>

          {/* Save — sits right after the last field */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty || Boolean(slugError)}
              className={buttonStyles.primary}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </button>
            <p aria-live="polite" className="min-w-0 text-sm">
              <SaveStatus
                error={saveError}
                isSaving={isSaving}
                isDirty={isDirty}
                justSaved={justSaved}
              />
            </p>
          </div>
        </div>

        {/* ═════════════ RIGHT — live preview ═════════════ */}
        <div className={`xl:sticky xl:top-6 xl:col-span-2 ${view === 'editor' ? 'hidden xl:block' : ''}`}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-fp-text-primary">Preview</h2>
            <p className="text-xs text-fp-text-secondary">Updates as you type</p>
          </div>

          <StoryPreview
            values={form}
            project={project}
            autoHeroImage={autoHeroImage}
            host={host}
          />
        </div>
      </div>
    </div>
  )
}