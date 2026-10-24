// scripts/rotate-magic-tokens.mjs
//
// One-off, OPT-IN: replaces the old cuid-style client portal tokens with strong
// random ones (see lib/magic-token.js for why).
//
// !! Rotating a token KILLS that client's existing portal link. Links already
// !! emailed or bookmarked stop working. The script prints each new link so you
// !! can send it to the client. Nothing changes unless you pass --apply.
//
// Usage (run from the project root; loads your env file for DATABASE_URL):
//   node --env-file=.env.local scripts/rotate-magic-tokens.mjs                 dry run: only counts
//   node --env-file=.env.local scripts/rotate-magic-tokens.mjs --apply        rotate every old token
//   node --env-file=.env.local scripts/rotate-magic-tokens.mjs --apply --project=<projectId>
//
// New tokens are printed to your terminal once. They are not stored anywhere
// else, so copy what you need before closing it.

import prisma from '../lib/prisma.js'
import { rotateLegacyMagicTokens } from '../lib/magic-token.js'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const projectArg = args.find((arg) => arg.startsWith('--project='))
const projectId = projectArg ? projectArg.slice('--project='.length) : null

if (projectArg && !projectId) {
  console.error('--project= needs a project id.')
  process.exit(1)
}

try {
  const result = await rotateLegacyMagicTokens({ db: prisma, apply, projectId })
  console.log(`Clients checked: ${result.total}. With an old-style token: ${result.legacy}.`)

  if (!apply) {
    console.log('Dry run: nothing was changed. Add --apply to rotate them (this breaks their existing links).')
  } else {
    const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')
    console.log(`Rotated: ${result.rotated.length}. Skipped (token changed meanwhile): ${result.skipped}.\n`)
    for (const item of result.rotated) {
      console.log(`${item.projectName} <${item.clientEmail}>\n  ${base}/portal/${item.token}\n`)
    }
  }
} finally {
  await prisma.$disconnect()
}
