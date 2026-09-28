// lib/prisma.js
//
// ONE shared PrismaClient for the whole app. Every other file imports
// it from here instead of creating its own connection.
//
// This stays a .js file on purpose: scripts/backfill-workspaces.mjs
// runs under plain Node (no TypeScript), and it imports lib/workspace.js,
// which imports this file. A .ts file here would break that script.
// The JSDoc comments below give TypeScript the types it needs anyway.

import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Anything you can run queries on: the shared client, OR the `tx` you
 * get inside `prisma.$transaction(async (tx) => { ... })`.
 * Every lib function that accepts an optional `db` uses this type.
 * (The full PrismaClient is assignable to it, so both work.)
 *
 * @typedef {import('@prisma/client').Prisma.TransactionClient} DbClient
 */

// Tells TypeScript that globalThis may carry our cached client.
// WITHOUT this line, `globalForPrisma.prisma` has no known type (`any`),
// and that `any` leaks into the exported `prisma` below. Then every
// `prisma.$transaction(async (tx) => ...)` in the app has an untyped
// `tx`, which is exactly what broke `next build`.
/** @type {typeof globalThis & { prisma?: PrismaClient }} */
const globalForPrisma = globalThis

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    // Fail loudly. Without this, `pg` silently falls back to localhost
    // and you get a confusing "connection refused" much later.
    throw new Error('DATABASE_URL is not set. Add it to .env.local (or your host\'s env settings).')
  }

  const pool = new Pool({
    connectionString,
    // Serverless hosts can spin up many instances. If your database hits
    // its connection limit, lower this with DATABASE_POOL_MAX.
    max: Number(process.env.DATABASE_POOL_MAX) || 10,
    // Give up after 10s instead of hanging forever if the DB is unreachable.
    connectionTimeoutMillis: 10_000,
  })

  // An idle connection can be dropped by the database (restart, network
  // blip, pooler timeout). `pg` reports that as an 'error' event on the
  // pool. If NOBODY is listening, Node treats it as an uncaught exception
  // and the whole server process crashes. This listener prevents that;
  // the pool simply replaces the dead connection.
  pool.on('error', (err) => {
    console.error('Unexpected error on an idle Postgres connection:', err)
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// In development, hot reload re-runs this file on every save. Caching the
// client on globalThis stops it opening a new pool each time. In production
// the module loads once, so no cache is needed.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma