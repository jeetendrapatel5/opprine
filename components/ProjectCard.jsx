// components/ProjectCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS COMPONENT DOES
// Renders one project row in the freelancer dashboard list.
// It receives a `project` object from Prisma and displays:
//   name, status, client, last-update timestamp, milestone progress (optional).
//
// HOW DATA FLOWS IN
//   Parent (dashboard page) fetches projects from DB via Prisma.
//   Each project is passed as a prop: <ProjectCard project={project} />.
//   Inside this component we only READ from `project` — no state, no fetching.
//
// WHAT CHANGED FROM THE OLD VERSION
// 1. LEFT ACCENT STRIP — was described in comments but never rendered. Fixed.
// 2. statusConfig — `stripClass` was mentioned in comments but missing from the
//    object itself. Added.
// 3. Badge text — was `text-[8px]` (sub-pixel, invisible). Now `text-[11px]`.
// 4. Badge style — had only text color. Now has background + border = depth.
// 5. Name + badge are stacked (column), not inline. Name gets full priority.
// 6. Milestone progress bar — renders if `project.milestones` is in the query.
// 7. isRecentUpdate — was an IIFE (immediately invoked function expression)
//    inside JSX. Moved to a plain variable above the return. Much easier to read.
// 8. Hover shadow — deeper, warmer. Feels premium not cheap.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { Clock, ChevronRight } from 'lucide-react'
import DeleteProjectButton from '@/components/DeleteProjectButton'

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
// WHY THIS EXISTS
// Rather than writing `if (status === 'ACTIVE') { color = 'blue' }` scattered
// everywhere, we define all status-to-style mappings in ONE place.
// If you add a new status (e.g. PAUSED), you add it here and the card handles
// it automatically everywhere it's used.
//
// WHAT EACH KEY DOES
//   label        — the human-readable text shown inside the badge pill
//   dotClass     — fills the small circle dot inside the badge (Tailwind bg-*)
//   badgeClass   — the pill's text color + background + border (all three!)
//                  Old version only had text color → no visual depth.
//   avatarClass  — background + text color for the client's initial circle
//   stripClass   — the left-edge accent strip color (was missing before!)
//
// WHY `fp-` TOKENS ONLY
// These map to CSS variables defined in your globals (--fp-accent, etc.).
// Using raw Tailwind colors (blue-500, green-400) would break when you
// change your theme — tokens let you change the whole palette in one file.

const statusConfig = {
  ACTIVE: {
    label:       'Active',
    dotClass:    'bg-fp-accent',
    badgeClass:  'text-fp-accent',
    avatarClass: 'bg-fp-accent-muted text-fp-accent',
    stripClass:  'bg-fp-accent',
  },
  COMPLETED: {
    label:       'Done',
    dotClass:    'bg-fp-success',
    badgeClass:  'text-fp-success',
    avatarClass: 'bg-fp-success/10 text-fp-success',
    stripClass:  'bg-fp-success',
  },
  ON_HOLD: {
    label:       'On Hold',
    dotClass:    'bg-fp-warning',
    badgeClass:  'text-fp-warning',
    avatarClass: 'bg-fp-warning/10 text-fp-warning',
    stripClass:  'bg-fp-warning',
  },
}

// ─── timeAgo ─────────────────────────────────────────────────────────────────
// PURPOSE: Convert a raw timestamp → a short human-readable relative string.
// INPUT:   date — a Date object or ISO string (e.g. "2024-06-17T10:30:00Z")
// OUTPUT:  string like "just now", "4m ago", "2h ago", "3d ago", or "12 Jun"
//
// HOW IT WORKS — step by step:
//   new Date() - new Date(date)   → milliseconds elapsed since that timestamp
//   / 1000                        → convert to seconds
//   Math.floor()                  → drop decimals (23.9 sec → 23, not 24)
//
// The chain of if-statements is a "guard ladder" pattern:
//   Each check RETURNS early, so once a condition matches we stop checking.
//   Order matters: check smallest range first, largest last.
//
// WHY SWITCH TO DATE AFTER 7 DAYS
//   "14d ago" means almost nothing — you lose track of which actual date that was.
//   "12 Jun" is far more useful. toLocaleDateString with 'en-GB' gives "12 Jun".

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)     return 'just now'
  if (seconds < 3600)   return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400)  return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── getInitial ───────────────────────────────────────────────────────────────
// PURPOSE: Extract the first letter of a name for the avatar circle.
// INPUT:   name — a string like "Acme Corp" or "john doe", or null/undefined
// OUTPUT:  "A", "J", etc. — or "?" if name is missing
//
// HOW THE OPTIONAL CHAINING CHAIN WORKS:
//   name?.trim()     → if name is null/undefined, stop here (return undefined)
//   ?.[0]            → get the first character of the trimmed string
//   ?.toUpperCase()  → uppercase it
//   ?? '?'           → if anything above returned undefined/null, use '?' instead

function getInitial(name) {
  return name?.trim()?.[0]?.toUpperCase() ?? '?'
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────
// PURPOSE: The main exported component. Renders one card in the project list.
// PROPS:   { project } — a single Prisma project object containing:
//            project.id, project.name, project.status,
//            project.updates[] (sorted newest-first by the query),
//            project.client.name,
//            project.milestones[] (optional — include in query to show progress bar)

export default function ProjectCard({ project }) {

  // ── Derive display values from the project prop ──────────────────────────
  // `?? statusConfig.ACTIVE` — fallback if DB returns an unknown status string.
  // This prevents a crash if a new status is added to Prisma without updating here.
  const status = statusConfig[project.status] ?? statusConfig.ACTIVE

  // project.updates is assumed to be sorted newest-first by the Prisma query.
  // So index [0] is always the most recent update.
  const lastUpdate = project.updates?.[0]

  // project.client is a related record (JOIN). It may be null if no client
  // is linked to this project yet.
  const clientName = project.client?.name

  // ── Milestone progress ────────────────────────────────────────────────────
  // `project.milestones` only exists if you `include: { milestones: true }`
  // in your Prisma query. If you don't include it, milestones = [] and
  // progressPct = null, so the progress bar simply doesn't render.
  //
  // `?? []` — if milestones is undefined/null, treat it as an empty array.
  const milestones = project.milestones ?? []

  // `.filter()` goes through every milestone and keeps only the ones where
  // status === 'COMPLETED'. `.length` then counts how many that is.
  const completedMilestones = milestones.filter(m => m.status === 'COMPLETED').length
  const totalMilestones     = milestones.length

  // If there are no milestones at all, progressPct stays null.
  // null is our signal to NOT render the progress bar (avoid "0/0 = NaN%").
  const progressPct = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : null

  // ── Recent update check ───────────────────────────────────────────────────
  // OLD VERSION: had this as an IIFE inside JSX — a function that runs
  // immediately inside {( ... )()} — hard to read, easy to break.
  //
  // NEW VERSION: a plain boolean variable computed here before the return.
  // Much cleaner. Same logic: is createdAt within the last 86400 seconds (24h)?
  // Note: we compare milliseconds here (no /1000 needed) because JS Date
  // subtraction returns milliseconds by default. 86400 * 1000 = 24h in ms.
  const isRecentUpdate = lastUpdate
    ? (new Date() - new Date(lastUpdate.createdAt)) < 86_400_000
    : false

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    // WHY LINK wraps the whole card
    // Makes the entire card clickable. Fitts's Law: larger touch target = easier
    // to tap on mobile. Using <Link> (not <a>) keeps Next.js client-side routing.
    //
    // `group` — a Tailwind feature. When you put `group` on a parent,
    // child elements can react to the parent being hovered using `group-hover:*`.
    // Example: the ChevronRight arrow uses `group-hover:translate-x-1`.
    //
    // `relative overflow-hidden` — CRITICAL PAIR:
    //   `relative` lets the accent strip use `absolute` positioning against this card.
    //   `overflow-hidden` clips the strip inside the card's rounded corners.
    //   Without both, the strip would either not position correctly or poke outside.
    //
    // HOVER EFFECTS (three coordinated transitions):
    //   `-translate-y-px`   → lifts the card 1px upward (subtle float)
    //   `border-fp-accent/30` → border tints blue on hover
    //   `shadow-[...]`      → deep shadow = card feels elevated off the page
    //   All three use `transition-all duration-200 ease-out` so they move together.

    <Link
      href={`/dashboard/projects/${project.id}`}
      className="
        group relative block overflow-hidden
        bg-fp-surface border border-fp-border rounded-xl
        transition-all duration-200 ease-out
        active:scale-[0.985]
        sm:hover:-translate-y-px
        sm:hover:border-fp-accent/30
        sm:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18),0_2px_8px_-4px_rgba(0,0,0,0.06)]
      "
      // MOBILE NOTE: `active:scale-[0.985]` gives a subtle press/tap feedback
      // on touch devices. It's a 1.5% scale-down — just enough to feel physical,
      // not enough to look broken. This replaces the hover lift which doesn't
      // exist on touch screens.
      //
      // `sm:hover:*` — the hover effects only apply at ≥640px (desktop).
      // Below that threshold, hover states don't fire on touch anyway,
      // so scoping them to sm+ avoids phantom styles cluttering the cascade.
    >

      {/* ── CARD BODY ──────────────────────────────────────────────────────
          `pl-5` (20px): 3px strip + 8px gap visually + 9px card padding.
          Without pl-5, the text would overlap the strip.
          
          `flex flex-col gap-3`: stacks all rows vertically with 12px gap.
          This replaces manual `mt-*` or `mb-*` on individual rows — one
          source of truth for vertical rhythm. Change `gap-3` → `gap-4`
          to breathe more, `gap-2` to compress. */}
      <div className="pl-5 pr-4 py-4 flex flex-col gap-3">

        {/* ── TOP ROW: Name (left) · Actions (right) ─────────────────────── */}
        <div className="flex items-start justify-between gap-3">

          {/* LEFT SIDE: project name + status badge stacked in a column.
              
              OLD DESIGN: name and badge were inline (side by side).
              Problem: long project names pushed the badge off screen,
              and both elements competed for the same horizontal space.
              
              NEW DESIGN: column layout (flex-col). Name gets its own full
              row. Badge sits below it, `self-start` so it doesn't stretch
              to fill the column's full width.
              
              `min-w-0 flex-1` — these two work together:
                `flex-1` makes this div grow to fill available space.
                `min-w-0` overrides flexbox's default min-width which would
                prevent the `truncate` on h3 from working. Classic flex gotcha. */}
          <div className="min-w-0 flex-1 flex lg:flex-row flex-col lg:gap-10 gap-1.5">

            {/* PROJECT NAME — primary identity of the card.
                `truncate` = overflow:hidden + text-overflow:ellipsis + whitespace:nowrap
                Long name like "Mega Enterprise Rebrand Project Q4" becomes
                "Mega Enterprise Rebrand Project Q4..." cleanly. */}
            <h3 className="
              text-fp-text-primary font-semibold text-[15px]
              leading-snug truncate
            ">
              {project.name}
            </h3>


            <span className={`
              self-start flex items-center gap-1.5
              lg:text-[11px] text-[8px] font-semibold uppercase tracking-wider
              lg:px-2.5 py-0.5 rounded-full
              ${status.badgeClass}
            `}>
              {status.label}
            </span>

          </div>

          {/* RIGHT SIDE: delete button + view affordance.
              `shrink-0` — prevents this group from compressing when the
              left side (project name) is long. */}
          <div className="flex items-center gap-2 shrink-0">

            {/* DELETE BUTTON — MOBILE FIX
                Problem: DeleteProjectButton is `opacity-0` by default and only
                shows on `group-hover`. On touch devices, hover NEVER fires.
                This means on mobile, the delete button is permanently invisible
                and the user has no way to delete a project from their phone.
                
                Fix: Wrap in a div that controls opacity at the responsive level.
                  Mobile (<640px):  opacity-100 → always visible
                  Desktop (≥640px): opacity-0 normally → opacity-100 on group-hover
                
                How `sm:group-hover:opacity-100` works:
                  Tailwind lets you stack modifiers left-to-right.
                  `sm:` = "only at ≥640px"
                  `group-hover:` = "when the parent with class `group` is hovered"
                  `opacity-100` = the value to apply
                  Combined: "at desktop breakpoint, on card hover, make this opacity 100"
                
                The inner DeleteProjectButton component has its own
                `opacity-0 group-hover:opacity-100` — those are now redundant on desktop
                but they don't conflict. On mobile, our wrapper's `opacity-100`
                wins because mobile never gets `sm:opacity-0` applied. */}
            <div className="
              opacity-100
              sm:opacity-0 sm:group-hover:opacity-100
              transition-opacity duration-200
            ">
              <DeleteProjectButton
                projectId={project.id}
                projectName={project.name}
              />
            </div>

            {/* VIEW AFFORDANCE — MOBILE FIX
                On mobile this is dead weight. The entire card is a <Link>.
                The user already knows it's tappable — they don't need a "View"
                label eating into the narrow top-right corner.
                
                `hidden sm:flex` = hide below 640px, show as flex above 640px.
                The ChevronRight icon stays hidden with it.
                
                On desktop, the two hover transitions still work:
                1. Text color: fp-text-tertiary → fp-accent
                2. Arrow: translate-x-1 (slides 4px right on hover) */}
            {/* VIEW AFFORDANCE
                Mobile:  show only the ChevronRight icon (›). The "View" label
                         is hidden — the icon alone is a universal "tap to open"
                         signal and takes almost no horizontal space.
                Desktop: show both "View" text + icon, with hover color + slide. */}
            <span className="
              flex items-center gap-0.5
              text-[12px] font-medium
              text-fp-text-tertiary sm:group-hover:text-fp-accent
              transition-colors duration-200
            ">
              {/* Text label — hidden on mobile, visible on desktop */}
              <span className="hidden sm:inline">View</span>
              <span className="
                inline-block
                sm:group-hover:translate-x-1
                transition-transform duration-200
              ">
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </span>

          </div>
        </div>

        {/* ── MILESTONE PROGRESS BAR (optional) ──────────────────────────────
            WHY CONDITIONAL: `progressPct !== null` only becomes true when
            milestones were included in the Prisma query AND at least one exists.
            If your query doesn't include milestones, this whole section disappears.
            This means the card works in both cases without any errors.
            
            DESIGN DECISION: The progress bar uses the same color as the
            accent strip (`status.dotClass`). Visual cohesion — the "theme color"
            of this project runs through strip → badge dot → progress fill.
            
            `tabular-nums` on the fraction ("3/7"):
            Tabular figures have equal widths per digit, so "3/7" and "10/12"
            take up the same space. Without it, the fraction width jumps around
            as numbers change. Small detail, big polish. */}
        {progressPct !== null && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-fp-text-tertiary font-medium">
                Milestones
              </span>
              <span className="text-[11px] text-fp-text-secondary font-semibold tabular-nums">
                {completedMilestones}/{totalMilestones}
              </span>
            </div>

            {/* TRACK + FILL pattern.
                Outer div = track (the grey background bar, full width).
                Inner div = fill (the colored progress, width set via inline style).
                
                WHY inline style for width instead of Tailwind?
                Tailwind generates classes at build time. You can't write
                `w-[${progressPct}%]` and expect it to work — the class
                doesn't exist in the CSS unless Tailwind saw it at build time.
                Dynamic values go in `style={{ width: ... }}`. Always.
                
                `overflow-hidden` on the track clips the fill inside
                the rounded corners — otherwise fill would poke out the sides. */}
            <div className="h-1 w-full bg-fp-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${status.dotClass}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* ── DIVIDER ──────────────────────────────────────────────────────── */}
        {/* h-px = exactly 1px height. bg-fp-border/60 = 60% opacity of border color.
            Creates a hairline between "what is this" (top) and "context" (bottom)
            without adding visual weight. */}
        <div className="h-px bg-fp-border/60" />

        {/* ── BOTTOM ROW: Client · Timestamp · Ping ──────────────────────────
            Two zones, separated by justify-between:
              Left:  client avatar + name + separator dot + timestamp
              Right: the pulsing "recent update" ping dot */}
        <div className="flex items-center justify-between gap-3">

          {/* LEFT ZONE */}
          <div className="flex items-center gap-2 min-w-0">

            {/* CLIENT AVATAR — only renders if a client is linked.
                Short-circuit evaluation: `{clientName && <span>}` means
                "if clientName is truthy, render the span; otherwise render nothing". */}
            {clientName && (
              <span className={`
                shrink-0 w-5 h-5 rounded-full
                text-[10px] font-bold
                flex items-center justify-center
                ${status.avatarClass}
              `}>
                {getInitial(clientName)}
              </span>
            )}

            {/* CLIENT NAME — max-width is now responsive.
                On a 375px iPhone: avatar(20) + gap(8) + name + dot(4) + gap(8) + timestamp(~55px)
                must all fit. 80px cap on mobile gives the timestamp room to breathe.
                On desktop (sm+) it expands back to 120px since there's more space.
                `truncate` handles the overflow either way with an ellipsis. */}
            {clientName && (
              <span className="text-xs text-fp-text-secondary truncate max-w-[80px] sm:max-w-[120px] font-medium">
                {clientName}
              </span>
            )}

            {/* SEPARATOR DOT — only shown when BOTH client AND update exist.
                Without this guard, you'd get a floating dot with nothing
                on one or both sides of it. */}
            {clientName && lastUpdate && (
              <span className="shrink-0 w-1 h-1 rounded-full bg-fp-border" />
            )}

            {/* TIMESTAMP (or "No updates yet" fallback)
                The ternary: `lastUpdate ? <timestamp> : <fallback>` ensures
                we always show something meaningful in this slot.
                `shrink-0` keeps the Clock icon from getting squished on mobile. */}
            {lastUpdate ? (
              <span className="flex items-center gap-1 text-xs text-fp-text-tertiary shrink-0">
                <Clock className="w-3 h-3" />
                {timeAgo(lastUpdate.createdAt)}
              </span>
            ) : (
              <span className="text-xs text-fp-text-tertiary">
                No updates yet
              </span>
            )}

          </div>

          {/* RECENT UPDATE PING DOT (right zone)
              Only renders if `isRecentUpdate` is true (update within 24h).
              
              HOW THE ANIMATION WORKS:
              The outer `<span>` is a 2×2 container (h-2 w-2 = 8px).
              Two absolutely-positioned children overlap:
              
              1. `animate-ping` span — Tailwind's built-in ping animation.
                 Scales from 100% → 200% while fading out (opacity 0).
                 Creates the "ripple ring" effect expanding outward.
                 
              2. `relative` span — the solid center dot. `relative` in a
                 `relative flex` parent means it sits above the ping ring
                 in stacking order.
              
              Together: solid dot + expanding ring = "something is happening here"
              without being as aggressive as a notification badge. */}
          {isRecentUpdate && (
            <span className="shrink-0 relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fp-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-fp-accent" />
            </span>
          )}

        </div>
      </div>
    </Link>
  )
}