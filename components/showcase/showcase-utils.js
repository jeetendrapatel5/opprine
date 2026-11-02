// components/showcase/showcase-utils.js
// ─────────────────────────────────────────────────────────────────────────────
// Small pure helpers shared by the public showcase components.
// No React in here — data in, data out (plus one class-string builder).
// ─────────────────────────────────────────────────────────────────────────────

// Pill-shaped buttons/links, built from one place so every call-to-action on
// the page looks the same. Colours come from the existing portal tokens.
//   solid   — the main action on a light background
//   outline — the quieter action next to it
const PILL_BASE =
  'inline-flex items-center justify-center rounded-full font-medium transition-colors duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-fp-portal-text-primary focus-visible:ring-offset-fp-portal-bg'

const PILL_VARIANTS = {
  solid:
    'bg-fp-portal-text-primary text-fp-portal-bg hover:bg-fp-portal-text-primary/85',
  outline:
    'border border-fp-portal-text-primary/25 text-fp-portal-text-primary hover:border-fp-portal-text-primary/60',
}

const PILL_SIZES = {
  sm: 'h-8 gap-1.5 px-4 text-sm',
  md: 'h-11 px-6 text-[15px]',
}

export function pill(variant = 'solid', size = 'md') {
  return `${PILL_BASE} ${PILL_VARIANTS[variant]} ${PILL_SIZES[size]}`
}

// "Mar 2026" — returns null when there is no date.
export function formatDate(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

// Only image files belong in the gallery.
export function getImageFiles(files) {
  return files.filter((file) => file.fileType?.startsWith('image/'))
}

// Returns the URL only if it is a normal web address.
// Stops a saved value like "javascript:..." from ever becoming a link.
export function safeExternalUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null
}

// Gallery rhythm: the 1st image of every group of three is shown wide, the
// next two sit side by side. A lone leftover image is also shown wide so the
// last row never has an empty hole.
export function isWideTile(index, total) {
  return index % 3 === 0 || (index === total - 1 && index % 3 === 1)
}