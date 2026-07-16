'use client'
// components/GithubConnectPanel.jsx
//
// Shows the GitHub webhook setup for a project, and — once at least one
// push has come through — a "connected" view where the freelancer can
// regenerate the secret or remove the connection.
//
// This is a Client Component ('use client') because it needs local state
// (reveal/hide secret, confirm dialogs, pending/error states). The original
// file had none of that, so it could stay a plain Server Component — this
// version can't.

import { useState, useTransition } from 'react'
import {
  Github,
  ChevronDown,
  Eye,
  EyeOff,
  RefreshCw,
  Unlink,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import CopyButton from '@/components/project/CopyButton'
import { timeAgoShort } from '@/lib/format'

const SETUP_STEPS = [
  'Go to your repo → Settings → Webhooks → Add webhook',
  'Paste the Payload URL and Secret below',
  'Set Content type to application/json',
  'Choose "Just the push event"',
  'Click Add webhook',
]

// Placeholder handlers — Step 2 will replace these with real server actions.
// Keeping them as no-ops (instead of leaving the props required) means this
// file works and is demoable on its own, before the backend is wired.
async function defaultRegenerate() {
  throw new Error('onRegenerateSecret is not wired up yet.')
}
async function defaultDisconnect() {
  throw new Error('onDisconnect is not wired up yet.')
}

export default function GithubConnectPanel({
  project,
  onRegenerateSecret = defaultRegenerate,
  onDisconnect = defaultDisconnect,
}) {
  const [secretVisible, setSecretVisible] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [confirming, setConfirming] = useState(null) // null | 'regenerate' | 'disconnect'
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  // ── No project yet ──────────────────────────────────────────────
  if (!project) {
    return (
      <div className="bg-fp-surface border border-fp-border rounded-xl px-4 py-4">
        <div className="flex items-center gap-2.5 mb-1">
          <Github className="w-4 h-4 text-fp-text-tertiary" />
          <h3 className="text-sm font-semibold text-fp-text-primary">GitHub Repository</h3>
        </div>
        <p className="text-[11px] text-fp-text-tertiary leading-relaxed">
          Create a project first, then come back here to connect its GitHub repo.
        </p>
      </div>
    )
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/github/${project.id}`
  const secret = project.githubWebhookSecret ?? ''
  // "Connected" = we've actually received a verified push, not just that a
  // secret exists. See the note at the end of my reply for the one field
  // this depends on.
  const isConnected = Boolean(project.githubLastSyncedAt)
  const lastSyncedLabel = timeAgoShort(project.githubLastSyncedAt)

  function runAction(kind, actionFn) {
    setError(null)
    startTransition(async () => {
      try {
        await actionFn(project.id)
        setConfirming(null)
      } catch {
        setError(
          kind === 'regenerate'
            ? "Couldn't regenerate the secret. Try again."
            : "Couldn't remove the connection. Try again.",
        )
      }
    })
  }

  return (
    <div className="bg-fp-surface border border-fp-border rounded-xl px-4 py-4 space-y-3.5">
      {/* ── Header ── */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-fp-raised border border-fp-border flex items-center justify-center shrink-0">
          <Github className="w-4 h-4 text-fp-text-secondary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fp-text-primary">GitHub Repository</h3>
          {isConnected ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-fp-success ring-2 ring-fp-success/25 shrink-0" />
              <p className="text-[11px] text-fp-text-tertiary truncate">
                Connected · synced {lastSyncedLabel}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-fp-text-tertiary mt-0.5">
              Turn pushes into client updates, automatically
            </p>
          )}
        </div>
      </div>

      {/* ── Not connected: full setup, always visible ── */}
      {!isConnected && (
        <div className="space-y-3">
          <p className="text-[11px] text-fp-text-tertiary leading-relaxed">
            Add this webhook to your repo. Every push to your main branch
            becomes an update in the client&apos;s feed — no manual writing needed.
          </p>

          <CredentialField label="Payload URL" value={webhookUrl} copyLabel="Copy" />
          <CredentialField
            label="Secret"
            value={secret}
            mask
            revealed={secretVisible}
            onToggleReveal={() => setSecretVisible((v) => !v)}
            copyLabel="Copy"
          />

          <ol className="text-[11px] text-fp-text-tertiary space-y-1 list-decimal list-inside leading-relaxed">
            {SETUP_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <div className="flex items-start gap-1.5 pt-2.5 border-t border-fp-border">
            <ShieldCheck className="w-3 h-3 text-fp-text-tertiary shrink-0 mt-0.5" />
            <p className="text-[10px] text-fp-text-tertiary leading-relaxed">
              We only store this signing secret to verify pushes came from
              GitHub — never your GitHub password or repo contents.
            </p>
          </div>
        </div>
      )}

      {/* ── Connected: collapsed by default, credentials tucked away ── */}
      {isConnected && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setManageOpen((v) => !v)}
            aria-expanded={manageOpen}
            className="w-full flex items-center justify-between text-[11px] font-medium text-fp-text-tertiary hover:text-fp-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/40 rounded-md py-0.5"
          >
            Manage webhook
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${manageOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {manageOpen && (
            <div className="space-y-3 pt-1">
              <CredentialField label="Payload URL" value={webhookUrl} copyLabel="Copy" />
              <CredentialField
                label="Secret"
                value={secret}
                mask
                revealed={secretVisible}
                onToggleReveal={() => setSecretVisible((v) => !v)}
                copyLabel="Copy"
              />

              {error && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-start gap-2 bg-fp-warning/10 border border-fp-warning/25 rounded-lg px-3 py-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-fp-warning shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-fp-warning font-medium">{error}</p>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="text-[10px] text-fp-text-tertiary hover:text-fp-text-primary underline underline-offset-2 mt-0.5"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {confirming ? (
                <ConfirmBar
                  message={
                    confirming === 'regenerate'
                      ? 'This invalidates the current secret until you update it on GitHub. Continue?'
                      : 'GitHub will stop sending updates until you reconnect. Remove this connection?'
                  }
                  isPending={isPending}
                  onCancel={() => setConfirming(null)}
                  onConfirm={() =>
                    runAction(
                      confirming,
                      confirming === 'regenerate' ? onRegenerateSecret : onDisconnect,
                    )
                  }
                />
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setConfirming('regenerate')}
                    disabled={isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border border-fp-border text-[11px] font-medium text-fp-text-secondary hover:text-fp-text-primary hover:border-fp-border/80 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/40"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate secret
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming('disconnect')}
                    disabled={isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border border-fp-border text-[11px] font-medium text-fp-text-secondary hover:text-fp-warning hover:border-fp-warning/30 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/40"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CredentialField — a labeled, copyable, optionally-maskable value ─────

function CredentialField({ label, value, mask = false, revealed, onToggleReveal, copyLabel }) {
  const displayValue = mask && !revealed ? '•'.repeat(Math.min(value.length || 24, 32)) : value

  return (
    <div>
      <label className="text-[10px] font-semibold text-fp-text-tertiary uppercase tracking-wide">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          readOnly
          value={displayValue}
          aria-label={label}
          className="flex-1 min-w-0 text-[11px] font-mono bg-fp-raised border border-fp-border rounded-lg px-2.5 py-2 text-fp-text-secondary truncate focus:outline-none"
        />
        {mask && (
          <button
            type="button"
            onClick={onToggleReveal}
            aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            className="shrink-0 w-8 h-8 rounded-lg border border-fp-border text-fp-text-tertiary hover:text-fp-text-primary hover:border-fp-border/80 flex items-center justify-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/40"
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        <CopyButton
          value={value}
          label={copyLabel ?? 'Copy'}
          className="h-8 px-3 shrink-0 rounded-lg bg-fp-surface border border-fp-border text-fp-text-tertiary hover:text-fp-text-primary hover:border-fp-border/80 transition-colors duration-150 text-[11px] font-medium"
        />
      </div>
    </div>
  )
}

// ─── ConfirmBar — inline confirm used for both regenerate & disconnect ────

function ConfirmBar({ message, isPending, onCancel, onConfirm }) {
  return (
    <div className="bg-fp-warning/10 border border-fp-warning/25 rounded-lg px-3 py-2.5 space-y-2">
      <p className="text-[11px] text-fp-text-secondary leading-relaxed">{message}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="h-7 px-2.5 rounded-md text-[11px] font-medium text-fp-text-tertiary hover:text-fp-text-primary transition-colors duration-150 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="h-7 px-2.5 rounded-md text-[11px] font-semibold bg-fp-warning text-black hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
        >
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          {isPending ? 'Working…' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}

// ─── Skeleton — for any spot that fetches project data client-side ────────
// Not used by page.jsx today, since that page fetches project data on the
// server before this component ever renders. Exported for later use (e.g.
// a dashboard widget that loads this over an API call).

export function GithubConnectPanelSkeleton() {
  return (
    <div className="bg-fp-surface border border-fp-border rounded-xl px-4 py-4 space-y-3.5 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-fp-raised" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-32 bg-fp-raised rounded" />
          <div className="h-2.5 w-24 bg-fp-raised rounded" />
        </div>
      </div>
      <div className="h-9 bg-fp-raised rounded-lg" />
      <div className="h-9 bg-fp-raised rounded-lg" />
    </div>
  )
}