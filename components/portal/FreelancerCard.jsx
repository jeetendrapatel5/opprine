// components/portal/FreelancerCard.jsx
//
// SERVER COMPONENT — pure display, no interactivity.
// Shows the freelancer's avatar, name, bio, and portfolio link.
//
// Props:
//   name         — string  — freelancer's display name
//   bio          — string  — one-line bio (optional)
//   avatarUrl    — string  — Cloudinary URL (optional)
//   portfolioUrl — string  — external link (optional)

import { ExternalLink } from 'lucide-react'

export default function FreelancerCard({ name, bio, avatarUrl, portfolioUrl }) {
  // If the freelancer hasn't filled in any profile info beyond their name,
  // we still show the card — just without the optional fields.
  // The card is always useful because it humanises the portal.

  return (
    <div
      className="rounded-2xl border border-white/5 p-5"
      style={{ background: '#0e0e12' }}
    >
      {/* Section label */}
      <p
        className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4"
        style={{ color: '#6b7280', fontFamily: 'DM Mono, monospace' }}
      >
        Your Developer
      </p>

      {/* Avatar + name row */}
      <div className="flex items-center gap-3 mb-3">

        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-12 h-12 rounded-full object-cover border-2 shrink-0"
            style={{ borderColor: '#ffffff10' }}
          />
        ) : (
          // Fallback initials circle when no avatar is set.
          // Uses the first character of the name.
          <div
            className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center border-2 text-base font-bold"
            style={{
              background:  '#F59E0B18',
              borderColor: '#F59E0B30',
              color:       '#F59E0B',
              fontFamily:  'DM Sans, sans-serif',
            }}
          >
            {name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}

        {/* Name + bio */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold text-white leading-snug"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {name}
          </p>
          {bio && (
            <p
              className="text-xs mt-0.5 leading-relaxed line-clamp-2"
              style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif' }}
            >
              {bio}
            </p>
          )}
        </div>
      </div>

      {/* Portfolio link — only shown if set */}
      {portfolioUrl && (
        
        <a href={portfolioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-medium transition-colors hover:text-white mt-1"
          style={{ color: '#F59E0B', fontFamily: 'DM Mono, monospace' }}
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {/* Strip https:// for display — cleaner to read */}
            {portfolioUrl.replace(/^https?:\/\//, '')}
          </span>
        </a>
      )}
    </div>
  )
}