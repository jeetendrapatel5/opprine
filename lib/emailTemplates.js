// lib/emailTemplates.js
//
// Responsibility: one function per email type, each returning an object
// with { subject, html }.
//
// WHY functions, not static strings:
// Every email needs dynamic content — client name, project name, a URL.
// Functions accept that data as parameters and interpolate it into the template.
//
// WHY return { subject, html } together:
// Subject and body belong together. When you call the template, you get
// everything you need to pass to sendEmail() in one step.
//
// DESIGN PHILOSOPHY:
// - Mobile-first. Most clients open email on their phone.
// - Single action per email. One CTA button, one clear thing to do.
// - Plain language. No jargon. Written for the client, not the developer.
// - Dark-friendly. Inline styles because email clients strip <style> tags.
//   We use a light theme because dark mode in email is unreliable across clients.

// ── Shared styles ─────────────────────────────────────────────────────────────
// Defined once so every template is visually consistent.
// These are inline CSS strings — email clients (Gmail, Outlook, Apple Mail)
// strip <style> blocks but respect inline styles.

const styles = {
  // Outer wrapper — centers the email and sets max width
  wrapper: `
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: #f9fafb;
    padding: 40px 16px;
    margin: 0;
  `,

  // The white card that contains the content
  card: `
    background: #ffffff;
    border-radius: 16px;
    padding: 40px;
    max-width: 520px;
    margin: 0 auto;
    border: 1px solid #e5e7eb;
  `,

  // Amber accent bar at the top of the card — Freeport branding
  accentBar: `
    width: 40px;
    height: 4px;
    background: #F59E0B;
    border-radius: 2px;
    margin-bottom: 24px;
  `,

  // Main heading inside the card
  heading: `
    font-size: 22px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 12px 0;
    line-height: 1.3;
  `,

  // Body paragraph text
  body: `
    font-size: 15px;
    color: #4b5563;
    line-height: 1.6;
    margin: 0 0 24px 0;
  `,

  // The main CTA button
  button: `
    display: inline-block;
    background: #F59E0B;
    color: #000000;
    font-weight: 700;
    font-size: 15px;
    padding: 14px 28px;
    border-radius: 10px;
    text-decoration: none;
    margin-bottom: 32px;
  `,

  // Divider line
  divider: `
    border: none;
    border-top: 1px solid #f3f4f6;
    margin: 24px 0;
  `,

  // Small muted text at the bottom
  footer: `
    font-size: 12px;
    color: #9ca3af;
    line-height: 1.5;
    margin: 0;
  `,

  // Label above a highlighted data point (e.g. "Project")
  metaLabel: `
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9ca3af;
    margin: 0 0 4px 0;
  `,

  // The highlighted data point itself
  metaValue: `
    font-size: 15px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 16px 0;
  `,
}

// ── Shared layout wrapper ─────────────────────────────────────────────────────
// Every template is wrapped in this. Keeps the outer structure consistent
// without repeating it in every function.

function emailWrapper(content) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Freeport</title>
    </head>
    <body style="${styles.wrapper}">
      <div style="${styles.card}">
        <div style="${styles.accentBar}"></div>
        ${content}
        <hr style="${styles.divider}" />
        <p style="${styles.footer}">
          This email was sent by Freeport · Your freelance client portal<br />
          If you weren't expecting this email, you can safely ignore it.
        </p>
      </div>
    </body>
    </html>
  `
}

// ── Template 1 — Milestone ready for review ───────────────────────────────────
// Sent to: client
// When: freelancer submits a delivery (milestone status → IN_REVIEW)
// Feature: 6.2
//
// Parameters:
//   clientName       — string — e.g. "Priya"
//   freelancerName   — string — e.g. "Jeetu"
//   projectName      — string — e.g. "Acme Website Redesign"
//   milestoneTitle   — string — e.g. "Homepage Design"
//   deliveryHeadline — string — the card headline the freelancer wrote
//   deliverySummary  — string — the summary paragraph (optional)
//   portalUrl        — string — full URL to the client portal e.g. https://app.freeport.dev/portal/abc123

export function milestoneReadyForReviewEmail({
  clientName,
  freelancerName,
  projectName,
  milestoneTitle,
  deliveryHeadline,
  deliverySummary,
  portalUrl,
}) {
  const subject = `${projectName} — Your review is needed`

  const html = emailWrapper(`
    <h1 style="${styles.heading}">
      ${deliveryHeadline ?? `${milestoneTitle} is ready for your review`}
    </h1>

    <p style="${styles.body}">
      Hi ${clientName}, ${freelancerName} has completed a milestone on your project
      and it's ready for your approval.
    </p>

    ${deliverySummary ? `
      <p style="${styles.body}">${deliverySummary}</p>
    ` : ''}

    <p style="${styles.metaLabel}">Project</p>
    <p style="${styles.metaValue}">${projectName}</p>

    <p style="${styles.metaLabel}">Milestone</p>
    <p style="${styles.metaValue}">${milestoneTitle}</p>

    <a href="${portalUrl}" style="${styles.button}">
      Review &amp; Approve →
    </a>

    <p style="${styles.body}">
      You can approve the work or request changes directly from the portal.
      No account needed — just click the button above.
    </p>
  `)

  return { subject, html }
}

// ── Template 2 — Milestone approved ──────────────────────────────────────────
// Sent to: freelancer
// When: client approves a milestone
// Feature: 6.3
//
// Parameters:
//   freelancerName  — string — e.g. "Jeetu"
//   clientName      — string — e.g. "Priya"
//   projectName     — string
//   milestoneTitle  — string — the milestone that was just approved
//   nextMilestone   — string | null — title of the next PENDING milestone if any
//   dashboardUrl    — string — full URL to the freelancer's project page

export function milestoneApprovedEmail({
  freelancerName,
  clientName,
  projectName,
  milestoneTitle,
  nextMilestone,
  dashboardUrl,
}) {
  const subject = `✓ ${clientName} approved "${milestoneTitle}"`

  const html = emailWrapper(`
    <h1 style="${styles.heading}">
      Milestone approved ✓
    </h1>

    <p style="${styles.body}">
      Great news, ${freelancerName}. ${clientName} has approved
      <strong>${milestoneTitle}</strong> on <strong>${projectName}</strong>.
    </p>

    ${nextMilestone ? `
      <p style="${styles.metaLabel}">Up next</p>
      <p style="${styles.metaValue}">${nextMilestone}</p>
    ` : `
      <p style="${styles.body}">
        All milestones are now complete. Time to wrap up the project.
      </p>
    `}

    <a href="${dashboardUrl}" style="${styles.button}">
      View Project →
    </a>
  `)

  return { subject, html }
}

// ── Template 3 — Reminder: milestone still awaiting review ───────────────────
// Sent to: client
// When: a cron job finds milestones IN_REVIEW for 3+ days with no response
// Feature: 6.4
//
// Parameters:
//   clientName     — string
//   freelancerName — string
//   projectName    — string
//   milestoneTitle — string
//   daysSinceSent  — number — how many days since it was sent (e.g. 3)
//   portalUrl      — string

export function milestoneReminderEmail({
  clientName,
  freelancerName,
  projectName,
  milestoneTitle,
  daysSinceSent,
  portalUrl,
}) {
  const subject = `Reminder: Your review is needed on ${projectName}`

  const html = emailWrapper(`
    <h1 style="${styles.heading}">
      Just a friendly reminder
    </h1>

    <p style="${styles.body}">
      Hi ${clientName}, ${freelancerName} is waiting for your feedback on a
      milestone that's been ready for ${daysSinceSent} days.
    </p>

    <p style="${styles.metaLabel}">Project</p>
    <p style="${styles.metaValue}">${projectName}</p>

    <p style="${styles.metaLabel}">Awaiting your review</p>
    <p style="${styles.metaValue}">${milestoneTitle}</p>

    <a href="${portalUrl}" style="${styles.button}">
      Review Now →
    </a>

    <p style="${styles.body}">
      It only takes a minute to approve or leave feedback. Your input keeps
      the project moving forward.
    </p>
  `)

  return { subject, html }
}

// ── Template 4 — Workspace invite ─────────────────────────────────────────────
// Sent to: someone being invited to join a workspace as a teammate
// When: an OWNER/ADMIN sends (or re-sends, after a revoke/expiry) an invite
// Feature: workspace invites
//
// Parameters:
//   inviterName   — string — e.g. "Jeetu" — the person who sent the invite
//   workspaceName — string — e.g. "Jeetu's Workspace"
//   acceptUrl     — string — full URL to the accept-invite page,
//                   e.g. https://app.opprine.com/invite/<token>

export function workspaceInviteEmail({ inviterName, workspaceName, acceptUrl }) {
  const subject = `${inviterName} invited you to join ${workspaceName} on Opprine`

  const html = emailWrapper(`
    <h1 style="${styles.heading}">
      You've been invited to join a workspace
    </h1>

    <p style="${styles.body}">
      ${inviterName} has invited you to join <strong>${workspaceName}</strong> on Opprine.
    </p>

    <p style="${styles.metaLabel}">Workspace</p>
    <p style="${styles.metaValue}">${workspaceName}</p>

    <a href="${acceptUrl}" style="${styles.button}">
      Accept Invite →
    </a>

    <p style="${styles.body}">
      This link expires in 24 hours. If you weren't expecting this, you
      can safely ignore this email — no account will be created.
    </p>
  `)

  return { subject, html }
}