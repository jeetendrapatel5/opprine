// components/dashboard/milestones/index.jsx
'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Loader2, ListTodo, LayoutTemplate, Lock } from 'lucide-react'
import MilestoneRow from './MilestoneRow'
import { DropdownMenu } from 'radix-ui'

// ── Status cycle map ───────────────────────────────────────────────────────
// Clicking "advance" on a milestone moves it to the next logical state.
// IN_REVIEW goes back to IN_PROGRESS (not forward) because approval
// is a client action, not a freelancer action.
const nextStatusMap = {
  PENDING:     'IN_PROGRESS',
  IN_PROGRESS: 'IN_REVIEW',
  IN_REVIEW:   'IN_PROGRESS',
  COMPLETED:   'PENDING',
}

// Statuses that count toward completion in the progress bar
const DONE_STATUSES = new Set(['COMPLETED', 'APPROVED'])

// NEW — used whenever this component is rendered without a `permissions`
// prop at all (an older call site, or a bug upstream). Fails CLOSED —
// same "don't assume access" rule the server-side can() function
// follows — rather than defaulting to "assume they can manage
// everything," which would be the more dangerous mistake to make by
// accident.
const DEFAULT_PERMISSIONS = {
  canManageMilestones: false,
  canPostToClientThread: false,
  canDeleteAnyTask: false,
  canUploadFiles: false,
  canManageFiles: false,
}

export default function MilestoneManager({
  projectId,
  initialMilestones,
  freelancerName,
  clientName,
  currentUserId,
  permissions = DEFAULT_PERMISSIONS,
}) {
  // NEW — one flag read everywhere below. IMPORTANT: this is UI
  // polish, not the security boundary. The actual boundary is the
  // can(role, 'manageMilestones') check already added server-side in
  // POST /api/milestones and PATCH/DELETE /api/milestones/[id] (see
  // last session). Hiding the button here just means a Contributor
  // doesn't click something that was always going to 403 anyway — it
  // stops a confusing error alert, it doesn't stop an attacker with
  // dev tools open, because the server was already the one saying no.
  const canManage = permissions.canManageMilestones

  const [milestones, setMilestones] = useState(initialMilestones ?? [])
  const [newTitle,   setNewTitle]   = useState('')
  const [isAdding,   setIsAdding]   = useState(false)
  const [updatingId, setUpdatingId] = useState(null)  // which row is mid-patch
  const [deletingId, setDeletingId] = useState(null)  // which row is being deleted

  // ── Templates ──────────────────────────────────────────────────────────
  // templates: null while loading, [] if the fetch fails or none exist —
  // either way the picker just shows no options, no separate error state
  // needed for something this low-stakes.
  const [templates,           setTemplates]           = useState(null)
  const [selectedTemplateKey, setSelectedTemplateKey]  = useState('')
  const [isApplyingTemplate,  setIsApplyingTemplate]   = useState(false)

  useEffect(() => {
    // CHANGED — no point fetching a list of templates someone can't
    // apply. Not a security fix (this endpoint returns a static list,
    // nothing sensitive), just skips a wasted request for a Contributor.
    if (!canManage) return
    axios.get('/api/milestones/templates')
      .then(({ data }) => setTemplates(data.templates))
      .catch(() => setTemplates([]))
  }, [canManage])

  // ── Drag state ─────────────────────────────────────────────────────────
  // dragId  = the milestone currently being dragged
  // overId  = the milestone the dragged item is hovering over (drop target)
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  // ── Derived progress stats ─────────────────────────────────────────────
  const total     = milestones.length
  const completed = milestones.filter((m) => DONE_STATUSES.has(m?.status)).length
  const progress  = total > 0 ? Math.round((completed / total) * 100) : 0

  // ── Drag handlers ──────────────────────────────────────────────────────
  // CHANGED — every one of these now bails out immediately if the
  // viewer can't manage milestones. This matters even though the
  // drag-triggering UI is also hidden below, because MilestoneRow
  // (not part of this upload) is the thing that actually attaches the
  // draggable/onDragStart/onDragOver/onDrop DOM handlers — until
  // that component is updated too, guarding the handler functions
  // here is the only thing stopping a stray drag event from doing
  // anything for a Contributor.

  const handleDragStart = (id) => {
    if (!canManage) return
    setDragId(id)
  }

  // e.preventDefault() is required — without it the browser blocks the drop event
  const handleDragOver = (e, id) => {
    if (!canManage) return
    e.preventDefault()
    setOverId(id)
  }

  // User dropped outside any valid target — reset visual state only
  const handleDragEnd = () => {
    setDragId(null)
    setOverId(null)
  }

  // User dropped the dragged row onto targetId.
  // Steps:
  //   1. Find from/to indices in the array
  //   2. splice() moves the item (mutates a copy, not the original)
  //   3. Optimistic update: apply to state immediately for instant feel
  //   4. Persist new order to database via PATCH /api/milestones/reorder
  //
  // FLAGGED — I have not seen /api/milestones/reorder. Your matrix
  // names "reorder" as part of manageMilestones, same tier as
  // create/edit/delete. If that route doesn't already call
  // can(role, 'manageMilestones') itself, this guard clause is
  // CURRENTLY THE ONLY THING stopping a Contributor from reordering —
  // and a guard in client-side React is not a real security boundary,
  // it's trivially bypassable from dev tools or a raw fetch() call.
  // Please send that route next.
  const handleDrop = async (targetId) => {
    if (!canManage) return
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setOverId(null)
      return
    }

    const from = milestones.findIndex((m) => m.id === dragId)
    const to   = milestones.findIndex((m) => m.id === targetId)
    const next = [...milestones]
    next.splice(to, 0, next.splice(from, 1)[0])

    setMilestones(next)
    setDragId(null)
    setOverId(null)

    try {
      await axios.patch('/api/milestones/reorder', {
        orderedIds: next.map((m) => m.id),
      })
    } catch {
      alert('Could not save new order. Please refresh.')
    }
  }

  // ── Status advance ─────────────────────────────────────────────────────
  // Cycles the milestone to the next status per nextStatusMap above.
  // Optimistically updates local state from the API response.
  const handleStatusChange = async (milestoneId, currentStatus) => {
    if (!canManage) return
    const nextStatus = nextStatusMap[currentStatus]
    setUpdatingId(milestoneId)
    try {
      const { data } = await axios.patch(`/api/milestones/${milestoneId}`, {
        status: nextStatus,
      })
      setMilestones((prev) =>
        prev.map((m) => m.id === milestoneId ? { ...m, status: data.status } : m)
      )
    } catch {
      alert('Could not update status. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  // ── Full milestone replace (after DeliveryModal submit) ────────────────
  // Called when a child component (e.g. DeliveryModal) returns a complete
  // updated milestone object after a form submission.
  const handleMilestoneUpdate = (updatedMilestone) => {
    if (!canManage) return
    setMilestones((prev) =>
      prev.map((m) => m.id === updatedMilestone.id ? { ...m, ...updatedMilestone } : m)
    )
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (milestoneId) => {
    if (!canManage) return
    if (!confirm('Delete this milestone and all its updates?')) return
    setDeletingId(milestoneId)
    try {
      await axios.delete(`/api/milestones/${milestoneId}`)
      setMilestones((prev) => prev.filter((m) => m.id !== milestoneId))
    } catch {
      alert('Failed to delete milestone.')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Add ────────────────────────────────────────────────────────────────
  // Appends a new milestone at the end of the ordered list.
  // The API sets order = milestones.length (0-based index of the new item).
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!canManage) return
    if (!newTitle.trim()) return
    setIsAdding(true)
    try {
      const { data } = await axios.post('/api/milestones', {
        projectId,
        title: newTitle.trim(),
        order: milestones.length,
      })
      // Merge the API response with empty relations so MilestoneRow renders correctly
      setMilestones((prev) => [
        ...prev,
        { ...data, milestoneUpdates: [], messages: [] },
      ])
      setNewTitle('')
    } catch {
      alert('Failed to add milestone.')
    } finally {
      setIsAdding(false)
    }
  }

  // ── Apply template ───────────────────────────────────────────────────
  // Creates a whole batch of milestones from a hardcoded template in one
  // call — POST /api/milestones/from-template does the actual creation
  // (and the ordering — same as handleAdd above, whatever `order` this
  // component sends is ignored; the server always computes it from
  // what's already on the project). This just merges the returned array
  // into local state, same "add empty relations" pattern handleAdd uses
  // for a single milestone, applied to all of them at once.
  //
  // FLAGGED — same as handleDrop above: I have not seen
  // /api/milestones/from-template. This guard clause is not a real
  // security boundary on its own.
  const handleApplyTemplate = async () => {
    if (!canManage) return
    if (!selectedTemplateKey) return
    setIsApplyingTemplate(true)
    try {
      const { data } = await axios.post('/api/milestones/from-template', {
        projectId,
        templateKey: selectedTemplateKey,
      })
      setMilestones((prev) => [
        ...prev,
        ...data.map((m) => ({ ...m, milestoneUpdates: [], messages: [] })),
      ])
      setSelectedTemplateKey('')
    } catch {
      alert('Could not apply template.')
    } finally {
      setIsApplyingTemplate(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-fp-surface rounded-xl overflow-hidden">

      {/* ── HEADER ──
          Shows the section title + a live progress bar + completion percentage.
          The drag hint is only shown when there are enough rows to reorder
          AND the viewer is allowed to reorder.
      ── */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-fp-border">
        <ListTodo className="w-3.5 h-3.5 text-fp-text-tertiary shrink-0" />
        <h2 className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest flex-1">
          Milestones
        </h2>

        {/* Right side: progress pill + drag hint */}
        {total > 0 && (
          <div className="flex items-center gap-3">
            {/* Mini inline progress bar */}
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-fp-raised rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: 'var(--color-fp-accent)',
                  }}
                />
              </div>
              <span className="text-[10px] font-bold tabular-nums text-fp-accent">
                {progress}%
              </span>
            </div>
            {/* CHANGED — was `milestones.length > 1`. A Contributor
                can't drag at all now, so telling them to isn't useful. */}
            {canManage && milestones.length > 1 && (
              <span className="text-[10px] text-fp-text-tertiary hidden sm:block">
                drag to reorder
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-5">

        {/* ── EMPTY STATE ── */}
        {milestones.length === 0 && (
          <div className="border border-dashed border-fp-border rounded-xl py-10 text-center mb-4">
            {/* Three placeholder dots as a visual stand-in for a milestone list */}
            <div className="flex justify-center gap-1.5 mb-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-fp-border/60" />
              ))}
            </div>
            <p className="text-fp-text-tertiary text-xs font-medium">No milestones yet</p>
            {/* CHANGED — a Contributor gets told why, instead of an
                instruction to start a template/add a milestone they
                have no way to act on. */}
            <p className="text-fp-text-tertiary text-[10px] mt-1">
              {canManage
                ? 'Start from a template below, or add the first step yourself'
                : 'None have been created for this project yet'}
            </p>
          </div>
        )}

        {/* ── MILESTONE LIST ── */}
        {milestones.length > 0 && (
          <div className="space-y-2 mb-4">
            {milestones.map((milestone) => (
              <MilestoneRow
                key={milestone.id}
                milestone={milestone}
                onStatusChange={handleStatusChange}
                onMilestoneUpdate={handleMilestoneUpdate}
                onDelete={handleDelete}
                isUpdating={updatingId === milestone.id}
                isDeleting={deletingId === milestone.id}
                freelancerName={freelancerName}
                clientName={clientName}
                // NEW — MilestoneRow isn't part of this upload yet, but
                // this is the shape it'll need once it is: `permissions`
                // for delivery-card editing / client-thread posting /
                // file and task rules, `currentUserId` specifically for
                // the task-delete rule (canDeleteTask compares against
                // task.createdByUserId / task.assignedToId, which needs
                // to know who's currently looking at the row).
                permissions={permissions}
                currentUserId={currentUserId}
                // Drag props — computed here so MilestoneRow stays a pure display component:
                // isDragging: this row is being dragged → render it semi-transparent
                // isOver:     this row is the current drop target → render accent border
                // CHANGED — draggable is now explicit and false for a
                // Contributor. Once MilestoneRow is updated, it should
                // set the DOM `draggable` attribute from this prop
                // instead of hardcoding `true`.
                draggable={canManage}
                isDragging={dragId === milestone.id}
                isOver={overId === milestone.id && dragId !== milestone.id}
                onDragStart={() => handleDragStart(milestone.id)}
                onDragOver={(e) => handleDragOver(e, milestone.id)}
                onDrop={() => handleDrop(milestone.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}

        {/* ── TEMPLATE PICKER ──
            Bulk-creates a whole set of milestones in one call. Only
            shown when the project has no milestones yet AND the viewer
            can manage milestones — a Contributor never sees this at all
            now, matching "view only" in the matrix.
        ── */}
        {milestones.length === 0 && canManage && (
          <div className="flex gap-2 mb-2">
            <select
              value={selectedTemplateKey}
              onChange={(e) => setSelectedTemplateKey(e.target.value)}
              disabled={isApplyingTemplate || !templates?.length}
              className="
                flex-1 bg-fp-raised border border-fp-border text-fp-text-secondary
                text-xs rounded-lg px-2.5 py-2.5
                focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
                disabled:opacity-50 transition-colors duration-150
              "
            >
              <option value="">
                {templates === null
                  ? 'Loading templates…'
                  : templates.length === 0
                    ? 'No templates available'
                    : 'Start from a template…'
                }
              </option>
              {(templates ?? []).map((t) => (
                <option key={t.key} value={t.key} title={t.description}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplyTemplate}
              disabled={!selectedTemplateKey || isApplyingTemplate}
              className="
                flex items-center gap-1.5 shrink-0
                bg-fp-raised hover:bg-fp-border/40 border border-fp-border
                text-fp-text-secondary text-xs font-bold px-3 py-2.5 rounded-lg
                transition-colors duration-150 disabled:opacity-50 cursor-pointer
              "
            >
              {isApplyingTemplate
                ? <Loader2        className="w-3.5 h-3.5 animate-spin" />
                : <LayoutTemplate className="w-3.5 h-3.5" />
              }
              Apply template
            </button>
          </div>
        )}

        {/* ── ADD MILESTONE FORM ──
            CHANGED — replaced entirely with a view-only notice when
            the viewer can't manage milestones, instead of a form that
            would just 403 on submit. */}
        {canManage ? (
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New milestone — e.g. Homepage design, Final handoff…"
              disabled={isAdding}
              className="
                flex-1 bg-fp-raised border border-fp-border text-fp-text-primary
                text-xs rounded-lg px-3 py-2.5
                placeholder:text-fp-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
                disabled:opacity-50 transition-colors duration-150
              "
            />
            <button
              type="submit"
              disabled={isAdding || !newTitle.trim()}
              className="
                flex items-center gap-1.5 shrink-0
                bg-fp-accent hover:bg-fp-accent-hover text-fp-base
                text-xs font-bold px-3 py-2.5 rounded-lg
                transition-colors duration-150 disabled:opacity-50 cursor-pointer
              "
            >
              {isAdding
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Plus    className="w-3.5 h-3.5" />
              }
              Add
            </button>
          </form>
        ) : (
          milestones.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-fp-text-tertiary px-1">
              <Lock className="w-3 h-3 shrink-0" />
              You have view-only access to milestones on this project.
            </div>
          )
        )}

      </div>
    </div>
  )
}