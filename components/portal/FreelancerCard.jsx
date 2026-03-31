// components/portal/FreelancerCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shows the freelancer's avatar, name, bio, and portfolio.
// Positioned at the top of the right column — the client sees it before invoices.
//
// Psychology (Section 4E — Trust Signals):
// "Humans trust people, not systems." The freelancer's name and face on the
// portal is a core trust signal. A client who has never met the developer
// sees this card and thinks "ah, this is the person building my thing."
// The avatar humanises the transaction. The bio positions the freelancer
// professionally. The portfolio link signals "this person has a track record."
//
// Design changes from old version:
// - Was dark (#0e0e12) with inline styles — now fp-portal-surface (white card).
// - Amber initials circle kept — amber = warm, personal, not corporate.
// - Portfolio URL shown without "https://" — cleaner for display.
//
// Server Component — pure display.
// ─────────────────────────────────────────────────────────────────────────────

import { ExternalLink } from 'lucide-react'

export default function FreelancerCard({ name, bio, avatarUrl, portfolioUrl }) {
  return (
    <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-5">

      {/* Section label */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-fp-portal-text-tertiary mb-4">
        Your Developer
      </p>

      {/* Avatar + name row */}
      <div className="flex items-center gap-3 mb-3">

        {/* Avatar — Cloudinary image or amber initial circle */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-11 h-11 rounded-full object-cover border border-fp-portal-border shrink-0"
          />
        ) : (
          // Amber initial circle — warm, personal, matches portal accent
          <div className="
            w-11 h-11 rounded-full shrink-0 flex items-center justify-center
            bg-fp-portal-accent/10 border border-fp-portal-accent/20
            text-fp-portal-accent text-base font-bold
          ">
            {name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}

        {/* Name + bio */}
        <div className="flex-1 min-w-0">
          <p className="text-fp-portal-text-primary text-sm font-semibold leading-snug">
            {name}
          </p>
          {bio && (
            <p className="text-fp-portal-text-secondary text-xs mt-0.5 leading-relaxed line-clamp-2">
              {bio}
            </p>
          )}
        </div>

      </div>

      {/* Portfolio link — only shown when the freelancer has set one */}
      {portfolioUrl && (
        <a
          href={portfolioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex items-center gap-1.5 text-xs font-medium
            text-fp-portal-accent hover:text-fp-portal-accent-hover
            transition-colors duration-150
          "
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {/* Strip https:// — cleaner for display */}
            {portfolioUrl.replace(/^https?:\/\//, '')}
          </span>
        </a>
      )}

    </div>
  )
}