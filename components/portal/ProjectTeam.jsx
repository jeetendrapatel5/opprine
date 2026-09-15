// components/portal/ProjectTeam.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Replaces the old single-freelancer "Your Developer" card. Shows every
// person staffed on the project (via ProjectMember) as a compact stack
// of avatars — the same trust-signal job FreelancerCard used to do
// ("a real human is behind this"), just honestly reflecting that it's
// usually a small team rather than one person.
//
// Server Component — receives already-fetched, already portal-safe
// `members` as props (see listProjectMembersForPortal in lib/project.js,
// called from page.jsx). All interaction (hover/click/tap → dialog)
// lives in ProjectTeamMember, a Client Component — this file only
// decides layout and whether the section renders at all.
// ─────────────────────────────────────────────────────────────────────────────

import ProjectTeamMember from './ProjectTeamMember'

// Cap how many avatars render before collapsing into a "+N" chip.
// Six keeps the stack compact even for a bigger studio team; adjust
// here only, everything else in this file already reads from it.
const MAX_VISIBLE = 6

export default function ProjectTeam({ members }) {
  // No explicit ProjectMember rows yet for this project (e.g. an older
  // project from before staffing existed, not yet backfilled) — hide
  // the section rather than show an empty "Team Behind Your Project"
  // heading with nothing under it.
  if (!members || members.length === 0) return null

  const visibleMembers = members.slice(0, MAX_VISIBLE)
  const overflowCount = members.length - visibleMembers.length

  return (
    <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-fp-portal-text-tertiary mb-4">
        Team Behind Your Project
      </p>

      <div className="flex items-center -space-x-2">
        {visibleMembers.map((member) => (
          <ProjectTeamMember key={member.userId} member={member} />
        ))}

        {overflowCount > 0 && (
          <div
            className="
              w-10 h-10 rounded-full shrink-0 flex items-center justify-center
              bg-fp-portal-raised border border-fp-portal-border
              ring-2 ring-fp-portal-surface
              text-fp-portal-text-secondary text-xs font-bold
            "
            title={`+${overflowCount} more`}
          >
            +{overflowCount}
          </div>
        )}
      </div>
    </div>
  )
}