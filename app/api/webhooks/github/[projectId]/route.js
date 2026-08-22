import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyGithubSignature } from '@/lib/verifyWebhook';
import { summarizeCommitForClient } from '@/lib/ai';
import { getEntitlements } from '@/lib/billing/entitlements';

export async function POST(request, { params }) {
  const { projectId } = await params;

  // 1. Read the RAW body as text — required for signature verification (see Part 3)
  const rawBody = await request.text();

  // 2. Find the project so we have its secret to check against
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || !project.githubWebhookSecret) {
    return NextResponse.json({ error: 'Unknown project' }, { status: 404 });
  }

  // 3. Confirm this request is genuinely from GitHub
  const signature = request.headers.get('x-hub-signature-256');
  const isValid = verifyGithubSignature(rawBody, signature, project.githubWebhookSecret);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 3.5 — NEW: is this workspace even entitled to GitHub integration?
  // `project.workspaceId` is already on the object above — no extra
  // query needed, it's a plain scalar field on Project.
  //
  // Deliberately checked here: AFTER the signature is verified (so we
  // don't leak plan info to an unauthenticated caller), but BEFORE the
  // AI summarization work (so a Free-plan workspace never costs you a
  // Gemini API call).
  const entitlements = await getEntitlements(project.workspaceId);
  if (!entitlements.features.githubIntegration) {
    // This is GitHub calling us, not a user clicking a button — so we
    // still return 200, not 403/402. Returning an error status here
    // would make GitHub think delivery failed and retry it repeatedly.
    // `ok: true` satisfies GitHub; `skipped` tells YOU why nothing
    // happened, if you're ever reading delivery logs.
    return NextResponse.json({ ok: true, skipped: 'github integration not on this plan' });
  }

  // 4. Only now is it safe to parse the body
  const payload = JSON.parse(rawBody);

  // 5. GitHub can send many event types to the same URL (stars, issues, etc).
  //    We only care about code pushes.
  const eventType = request.headers.get('x-github-event');
  if (eventType !== 'push') {
    return NextResponse.json({ ok: true, skipped: eventType });
  }

  // 6. A single push can bundle several commits. Show the client only the
  //    latest one — a feed of 5 commits from one push would just be noise.
  const commits = payload.commits || [];
  if (commits.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no commits' });
  }
  const latestCommit = commits[commits.length - 1];

  // Everything above this line is fast (DB lookup, signature check). The AI
  // rewrite can take several seconds, and GitHub's webhook delivery times
  // out at roughly 10s — so we respond now and finish the slow part
  // (AI summarization + DB write) in the background with after(). If it
  // fails, we've already told GitHub "ok", so failures are logged, not
  // retried by GitHub — acceptable here since a missed client update isn't
  // critical, but worth knowing if that ever changes.
  after(async () => {
    try {
      const summary = await summarizeCommitForClient(latestCommit.message, project.name);
      if (!summary) return;

      const update = await prisma.update.create({
        data: {
          projectId: project.id,
          type: 'AUTO_DEPLOY',
          text: summary,
          commitSha: latestCommit.id.substring(0, 7),
          commitUrl: latestCommit.url,
        },
      });

      // 9. Optional: reuse your existing Resend function to notify the client
      // await sendUpdateNotification(project, update);
    } catch (err) {
      console.error('Background commit summarization failed:', err);
    }
  });

  return NextResponse.json({ ok: true, accepted: true });
}