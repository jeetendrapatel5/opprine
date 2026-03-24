// lib/projectProgress.js
//
// A pure utility function. "Pure" means:
//   - It takes input (milestones array)
//   - It returns output (a progress object)
//   - It does NOT call the database
//   - It does NOT call any API
//   - It does NOT use React state
//
// This makes it usable anywhere — server components, client components, API routes.
// You import it, call it, get your data. That's it.

export function getProjectProgress(milestones) {
  // Guard clause — if there are no milestones at all, return safe zero values.
  // Without this, dividing by zero below would give you NaN, which breaks UI.
  if (!milestones || milestones.length === 0) {
    return {
      completed:        0,
      total:            0,
      percentage:       0,
      currentMilestone: null,
      projectStatus:    'ON_TRACK',
    }
  }

  const total = milestones.length

  // Count how many milestones have reached COMPLETED status
  const completed = milestones.filter(m => m.status === 'COMPLETED').length

  // Math.round prevents values like 33.333...%
  // Example: 1 of 3 done → Math.round((1/3)*100) = 33
  const percentage = Math.round((completed / total) * 100)

  // "currentMilestone" is the first milestone that is actively IN_PROGRESS.
  // "first" here means lowest order value — the one that comes earliest in the list.
  // We assume milestones are already sorted by order when passed in.
  // If nothing is IN_PROGRESS, this will be null.
  const currentMilestone = milestones.find(m => m.status === 'IN_PROGRESS') ?? null

  // projectStatus — three possible values, checked in priority order:
  //
  //   'AWAITING_REVIEW' — something needs the client's attention RIGHT NOW
  //                       Takes highest priority. Even if 9 of 10 are done,
  //                       if one is IN_REVIEW, that's what matters most.
  //
  //   'COMPLETED'       — every single milestone is COMPLETED.
  //                       Only true when completed === total AND total > 0.
  //
  //   'ON_TRACK'        — the default. Work is happening, nothing needs review.
  const hasInReview  = milestones.some(m => m.status === 'IN_REVIEW')
  const allCompleted = completed === total

  const projectStatus = hasInReview  ? 'AWAITING_REVIEW'
                      : allCompleted ? 'COMPLETED'
                      :               'ON_TRACK'

  return {
    completed,          // number  — e.g. 2
    total,              // number  — e.g. 5
    percentage,         // number  — e.g. 40  (already multiplied by 100, ready to use)
    currentMilestone,   // object  — the full milestone object, or null
    projectStatus,      // string  — 'ON_TRACK' | 'AWAITING_REVIEW' | 'COMPLETED'
  }
}