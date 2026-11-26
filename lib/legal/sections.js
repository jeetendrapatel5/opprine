// lib/legal/sections.js
//
// Pure helpers for the legal pages. No React or Next.js imports, so they can
// be tested with `node --test lib/legal/sections.test.js`.

// The legal documents, in the order they appear in the switcher and footer.
// `title` must match the `title` prop each page passes to <LegalPage>.
export const LEGAL_DOCUMENTS = [
  { title: 'Terms of Service', href: '/terms' },
  { title: 'Privacy Policy', href: '/privacy' },
  { title: 'Cancellation and Refund Policy', href: '/refund-policy' },
]

// Plain text of a React node: "Who we are" or ["Who ", <b>we</b>, " are"].
export function textOf(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (typeof node === 'object' && node.props) return textOf(node.props.children)
  return ''
}

// "Who we are" -> "who-we-are"
export function slugify(text) {
  return (
    text
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  )
}

// Slugs for a list of headings. A repeated heading gets -2, -3 and so on,
// so two sections never share an anchor.
export function uniqueSlugs(titles) {
  const seen = new Map()
  return titles.map((title) => {
    const base = slugify(title)
    const count = (seen.get(base) || 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base}-${count}`
  })
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

// "25 November 2026" -> "2026-11-25" for <time dateTime>. Returns null when
// the text is not in that format, and the page then simply omits dateTime.
export function toIsoDate(text) {
  const match = /^\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*$/.exec(text || '')
  if (!match) return null
  const day = Number(match[1])
  const month = MONTHS.indexOf(match[2].toLowerCase()) + 1
  const year = Number(match[3])
  if (!month) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Which section the reader is in. `items` are in document order, `top` is the
// heading's distance from the top of the viewport. The active section is the
// last one whose heading has reached `offset`. At the very bottom of the page
// the last section is active, even if it is too short to reach `offset`.
export function pickActiveSection(items, offset = 120, atBottom = false) {
  if (!items.length) return null
  if (atBottom) return items[items.length - 1].id
  let active = items[0].id
  for (const item of items) {
    if (item.top <= offset) active = item.id
    else break
  }
  return active
}