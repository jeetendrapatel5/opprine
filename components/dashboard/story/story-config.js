// components/dashboard/story/story-config.js
// ─────────────────────────────────────────────────────────────────────────────
// Constants and pure helper functions shared by the Project Story editor and
// its live preview. No React in here — just data in, data out.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_TECH_TAGS = 12
export const MAX_NARRATIVE = 600
export const SLUG_PATTERN  = /^[a-z0-9-]+$/

export const INDUSTRY_OPTIONS = [
  'E-commerce',
  'SaaS',
  'Healthcare',
  'Education',
  'Real Estate',
  'Finance',
  'Agency / Brand',
  'Other',
]

// Turns the project from the database into the editable form values.
// Every field gets a safe fallback so inputs are never "uncontrolled".
export function toFormValues(project) {
  return {
    caseStudyEnabled:    project.caseStudyEnabled    ?? false,
    publicSlug:          project.publicSlug          ?? '',
    caseStudyCoverImage: project.caseStudyCoverImage ?? null,
    caseStudyIndustry:   project.caseStudyIndustry   ?? '',
    caseStudyTechStack:  project.caseStudyTechStack  ?? [],
    caseStudyHideClient: project.caseStudyHideClient ?? true,
    caseStudyProblem:    project.caseStudyProblem    ?? '',
    caseStudyOutcome:    project.caseStudyOutcome    ?? '',
  }
}

// Turns the form values into the JSON body of the PATCH request.
// Empty strings become null so the database stores "no value", not "".
export function toPayload(values) {
  return {
    caseStudyEnabled:    values.caseStudyEnabled,
    publicSlug:          values.publicSlug          || null,
    caseStudyCoverImage: values.caseStudyCoverImage || null,
    caseStudyIndustry:   values.caseStudyIndustry   || null,
    caseStudyTechStack:  values.caseStudyTechStack,
    caseStudyHideClient: values.caseStudyHideClient,
    caseStudyProblem:    values.caseStudyProblem    || null,
    caseStudyOutcome:    values.caseStudyOutcome    || null,
  }
}

// The image used as the hero when no cover has been uploaded:
// 1. the first completed milestone that has an image delivery
// 2. otherwise the newest project file that is an image
// 3. otherwise null
export function getAutoHeroImage(project) {
  for (const milestone of project.milestones) {
    if (milestone.deliveryFileUrl && milestone.deliveryFileType?.startsWith('image/')) {
      return milestone.deliveryFileUrl
    }
  }
  const imageFile = project.files.find((file) => file.fileType?.startsWith('image/'))
  return imageFile?.url ?? null
}