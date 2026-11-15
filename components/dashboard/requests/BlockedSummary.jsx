// components/dashboard/requests/BlockedSummary.jsx
// The "waiting on client" ledger: how long the project has been blocked.

import { daysSince, plural } from './request-format'

export default function BlockedSummary({ blocked }) {
  const project = blocked?.project
  if (!project) return null

  const longest =
    project.openBlockingCount > 0 && project.oldestOpenSince ? daysSince(project.oldestOpenSince) : 0

  const stats = [
    { label: 'Blocked on client', value: plural(project.blockedDays, 'day') },
    { label: 'Waiting now', value: String(project.openBlockingCount) },
    { label: 'Longest wait', value: plural(longest, 'day') },
  ]

  return (
    <dl className="grid grid-cols-3 divide-x divide-fp-border rounded-xl border border-fp-border">
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 px-3 py-3 sm:px-4">
          <dt className="text-[10px] font-bold uppercase leading-tight tracking-widest text-fp-text-secondary">
            {stat.label}
          </dt>
          <dd className="mt-1.5 text-base font-semibold tabular-nums text-fp-text-primary">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
