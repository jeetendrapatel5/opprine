// components/portal/ProjectTeam.jsx
// Everyone staffed on the project, as a compact avatar stack. `members` arrive
// already portal-safe (see listProjectMembersForPortal in lib/project.js).
// Server Component; hover/tap behaviour lives in ProjectTeamMember.

import { Users } from 'lucide-react'
import ProjectTeamMember from './ProjectTeamMember'
import { Card, CardBody, CardHeader } from './ui'

// Avatars shown before the rest collapse into a "+N" chip.
const MAX_VISIBLE = 6

export default function ProjectTeam({ members, bare = false }) {
  // Projects without staffing rows yet (older projects) hide the card entirely.
  if (!members || members.length === 0) return null

  const visibleMembers = members.slice(0, MAX_VISIBLE)
  const overflowCount = members.length - visibleMembers.length

  const avatars = (
    <ul className="flex items-center -space-x-2">
      {visibleMembers.map((member) => (
        <li key={member.userId}>
          <ProjectTeamMember member={member} />
        </li>
      ))}

      {overflowCount > 0 && (
        <li
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-fp-portal-border bg-fp-portal-raised text-xs font-bold text-fp-portal-text-secondary ring-2 ring-fp-portal-surface"
          title={`+${overflowCount} more`}
        >
          +{overflowCount}
        </li>
      )}
    </ul>
  )

  if (bare) {
    return (
      <>
        {avatars}
        <span className="sr-only">Select a photo to see who they are.</span>
      </>
    )
  }

  return (
    <Card as="section" aria-labelledby="team-title">
      <CardHeader icon={Users} titleId="team-title" title="Team behind your project" />
      <CardBody>
        {avatars}
        <p className="mt-3 text-xs text-fp-portal-text-muted">Select a photo to see who they are.</p>
      </CardBody>
    </Card>
  )
}
