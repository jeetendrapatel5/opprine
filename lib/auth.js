// lib/auth.js
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

// ── Session invalidation after a password reset ───────────────────────
//
// Opprine uses session: { strategy: "jwt" } below. That means a
// session is just a signed cookie the browser holds — there is no row
// in a database that "is" the session, and therefore nothing to
// delete when a password changes. Left alone, a JWT issued yesterday
// would keep working today even if the password changed five minutes
// ago.
//
// The fix: User.passwordChangedAt (see prisma/schema.prisma) records
// the moment a password last changed. Every JWT already carries a
// standard `iat` ("issued at") claim, stamped automatically by
// NextAuth. So on each request, jwt() below compares the two: if the
// password changed AFTER this particular token was issued, the token
// is stale and gets marked invalid.
//
// PASSWORD_CHECK_INTERVAL_MS is the one deliberate trade-off in this
// design. Checking the database on literally every request would
// defeat half the point of using JWT sessions (avoiding a DB round
// trip per request). Checking only at sign-in would mean a reset
// never actually revokes anything. This re-checks at most once per
// minute per active session — worst case, a token stolen right before
// a password reset stays usable for a bit less than 60 seconds
// afterwards. That's the number to change if you want tighter (lower
// value, more DB reads) or looser (higher value) behavior.
const PASSWORD_CHECK_INTERVAL_MS = 60 * 1000

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "text"     },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!passwordMatch) return null

        return {
          id:    user.id,
          name:  user.name,
          email: user.email,
          plan:  user.plan,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      const now = Date.now()

      if (user) {
        // Fresh sign-in — `user` is only present on this one call,
        // right after authorize() succeeds. Nothing to invalidate on
        // a token we just created, so record the check time and
        // return immediately.
        token.id   = user.id
        token.plan = user.plan
        token.pwCheckedAt = now
        return token
      }

      // An existing session being read/refreshed. Re-verify against
      // the database at most once per PASSWORD_CHECK_INTERVAL_MS —
      // see the comment on that constant above for why.
      if (!token.pwCheckedAt || now - token.pwCheckedAt > PASSWORD_CHECK_INTERVAL_MS) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { passwordChangedAt: true, plan: true },
        })

        if (!dbUser) {
          // Account no longer exists (e.g. deleted). Mark invalid the
          // same way a password-change does — see session() below.
          token.invalidated = true
          return token
        }

        // token.iat ("issued at") is a standard JWT claim, in whole
        // seconds since the epoch — NextAuth sets it automatically
        // when the token is first signed. If the password changed
        // AFTER that moment, this token predates the reset and must
        // stop being accepted.
        if (
          dbUser.passwordChangedAt &&
          dbUser.passwordChangedAt.getTime() > token.iat * 1000
        ) {
          token.invalidated = true
          return token
        }

        token.plan = dbUser.plan
        token.pwCheckedAt = now
      }

      return token
    },

    async session({ session, token }) {
      if (token?.invalidated) {
        // No `session.user` on the returned object, and an already-
        // expired `expires` timestamp. next-auth/react's useSession()
        // reads this as "unauthenticated." On the server,
        // getServerSession(authOptions) returns this same shape, so
        // any route following the common `if (!session?.user) ...`
        // guard rejects the request too — no changes needed in the
        // other route files that already do this check.
        return { ...session, user: null, expires: new Date(0).toISOString() }
      }

      if (token) {
        session.user.id   = token.id
        session.user.plan = token.plan
      }
      return session
    },
  },

  session: { strategy: "jwt" },

  pages: { signIn: "/signin" },

  secret: process.env.NEXTAUTH_SECRET,
}