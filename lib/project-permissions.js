// lib/project-permissions.js
//
// Single source of truth for "what can this role do on a project."
// Mirrors lib/billing/plans.js: one file decides, every other file
// asks it by calling can(role, 'actionName') — no route or component
// ever compares role === 'CONTRIBUTOR' (or anything else) directly.
//
// WHERE `role` COMES FROM
// ------------------------
// requireProjectMembership() (lib/project.js) returns one of FIVE
// possible strings as .role, for a given user + project:
//
//   'OWNER' | 'ADMIN'                              <- OWNER/ADMIN of the
//                                                      project's WORKSPACE:
//                                                      implicit access to every
//                                                      project in it. Checked
//                                                      FIRST, so a ProjectMember
//                                                      row never downgrades them.
//   'PROJECT_MANAGER' | 'CONTRIBUTOR' | 'VIEWER'   <- a real ProjectMember row
//                                                      (workspace MEMBER).
//
// A workspace member with no row gets no role at all: lib/project.js throws
// ForbiddenError (page shows "access restricted"). An outsider gets NotFoundError.
//
// can() collapses OWNER and ADMIN into one tier, OWNER_OR_ADMIN,
// because the finalized matrix treats them identically at the project
// level (they only diverge on workspace-level billing/removal, which
// is out of scope for this file).

const PROJECT_PERMISSIONS = {
  OWNER_OR_ADMIN: {
    // Client contact info
    viewClient: true,
    editClient: true,
    deleteClient: true,

    // Invoices / financial data
    viewInvoices: true,
    createInvoices: true,
    editInvoices: true,

    // Milestones — create/edit/reorder/delete, and the delivery card
    // content on them. One action covers both: they're edited through
    // the same route (PATCH /api/milestones/[id]).
    manageMilestones: true,

    // Client message thread
    viewClientThread: true,
    postToClientThread: true,

    // Tasks
    createTask: true,
    editAnyTask: true,
    deleteAnyTask: true,

    // Files / deliverables
    uploadFiles: true,
    deleteFiles: true,

    // Project updates (notes + GitHub feed)
    postOwnUpdate: true,
    manageAnyUpdate: true,

    // Staffing
    manageStaffing: true,
    viewRoster: true,

    // Project settings + deletion
    manageProjectSettings: true,
    deleteProject: true,

    // GitHub webhook config
    linkGithubRepo: true,
    manageGithubWebhook: true, // includes seeing/regenerating the real secret

    // Showcase / public case study
    draftShowcase: true,
    publishShowcase: true,

    // Inbound inquiries (leads)
    viewInquiries: true,
  },

  PROJECT_MANAGER: {
    viewClient: true,
    editClient: true,
    deleteClient: false, // <- only Owner/Admin can delete a client

    viewInvoices: true,
    createInvoices: true, // CHANGED — was false ("view only" per the original matrix). Product decision: PM should have the same create/delete rights as Owner/Admin here — only CONTRIBUTOR stays locked out of invoices entirely.
    editInvoices: true,   // CHANGED — was false. Covers the "Cancel invoice" action (status → CANCELLED) in InvoiceList — there's no separate hard-delete action currently built; this is what "delete" maps to today.

    manageMilestones: true,

    viewClientThread: true,
    postToClientThread: true,

    createTask: true,
    editAnyTask: true,
    deleteAnyTask: true,

    uploadFiles: true,
    deleteFiles: true,

    postOwnUpdate: true,
    manageAnyUpdate: true,

    manageStaffing: true,
    viewRoster: true,

    manageProjectSettings: true,
    deleteProject: false, // <- PM cannot delete the project

    linkGithubRepo: true,       // can link a repo...
    manageGithubWebhook: false, // ...but the secret always stays masked to them

    draftShowcase: true,
    publishShowcase: false, // <- publish requires Owner/Admin

    viewInquiries: true,
  },

  CONTRIBUTOR: {
    viewClient: false,
    editClient: false,
    deleteClient: false,

    viewInvoices: false,
    createInvoices: false,
    editInvoices: false,

    manageMilestones: false, // view-only — enforced by never granting this action

    viewClientThread: true,  // can read the thread...
    postToClientThread: false, // ...but never post to it

    createTask: true,
    editAnyTask: true,
    deleteAnyTask: false, // <- see canDeleteTask() below for the real rule

    uploadFiles: true,
    deleteFiles: false,

    postOwnUpdate: true,
    manageAnyUpdate: false, // can't edit/delete OTHER people's updates

    manageStaffing: false,
    viewRoster: true, // can see who's on the project, just can't change it

    manageProjectSettings: false,
    deleteProject: false,

    linkGithubRepo: false,
    manageGithubWebhook: false,

    draftShowcase: false,
    publishShowcase: false,

    viewInquiries: false,
  },
}

// Every valid action name, derived from the OWNER_OR_ADMIN tier (which
// always has every key). Used to catch typos loudly instead of
// silently treating a misspelled action as "no access."
const VALID_ACTIONS = new Set(Object.keys(PROJECT_PERMISSIONS.OWNER_OR_ADMIN))

// can(role, action) -> boolean
//
// Fails CLOSED (returns false) for:
//   - 'VIEWER' — it exists in the schema's ProjectRole enum, marked
//     "reserved for future use," but ISN'T in the matrix you gave me.
//     Building it into a tier here would be guessing at what a
//     read-only viewer should see. Until you decide, a VIEWER can do
//     literally nothing through can() — including view — which is
//     probably too strict for a role named "viewer," but it's the
//     safe default until you tell me otherwise.
//   - any role string can() doesn't recognize at all.
//
// Throws for an unrecognized ACTION name — that's a bug in the
// calling code (a typo), not a permission decision, and should fail
// loudly in development rather than quietly behaving like "no access"
// until someone notices a feature is broken in production.
export function can(role, action) {
  if (!VALID_ACTIONS.has(action)) {
    throw new Error(`can(): "${action}" is not a recognized permission action.`)
  }

  const tierKey = ['OWNER', 'ADMIN'].includes(role) ? 'OWNER_OR_ADMIN' : role
  const tier = PROJECT_PERMISSIONS[tierKey]
  return Boolean(tier?.[action])
}

// Task deletion is the one row in the matrix that ISN'T a flat
// yes/no per role: a CONTRIBUTOR can't delete "any" task
// (deleteAnyTask: false for them, above), but CAN delete a task they
// created or are assigned to. That needs the actual task row, not
// just a role string — so it can't live inside the flat can() lookup.
// It still lives in THIS file though, so no route has to reason about
// the task-deletion rule itself; they all just call this function.
export function canDeleteTask(role, task, userId) {
  if (can(role, 'deleteAnyTask')) return true
  return task.createdByUserId === userId || task.assignedToId === userId
}

// Builds a Prisma `select` object for a Project read, shaped by role.
// This is the actual fix for the "response shaping, not UI hiding"
// requirement: a Contributor's `select` never asks the database for
// `client` or `invoices` in the first place, so there's no field to
// forget to strip out later. A forgotten `delete shaped.client` in
// one code path is a real leak; a field that was never SELECTed can't
// leak from that path no matter what else changes around it.
//
// Use it like this, in whichever route does GET /api/projects/[id]:
//   const project = await prisma.project.findUnique({
//     where: { id },
//     select: buildProjectSelect(role),
//   })
export function buildProjectSelect(role) {
  return {
    id: true,
    name: true,
    description: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    isPublic: true,
    publicSlug: true,

    client: can(role, 'viewClient'),
    invoices: can(role, 'viewInvoices'),
    inquiries: can(role, 'viewInquiries'),

    // The PM "secret always masked" rule is enforced by never
    // SELECTing the real value for them — not by fetching it and
    // replacing it with dots afterward.
    githubWebhookSecret: can(role, 'manageGithubWebhook'),
    githubRepoOwner: true,
    githubRepoName: true,
  }
}