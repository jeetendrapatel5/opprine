import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createWorkspaceForUser } from "@/lib/workspace";
import { acceptInvite } from "@/lib/invites";

export async function POST(request: Request) {
    try {
        const { name, email, password, inviteToken } = await request.json();

        // Accept the token as an optional field. Defensive typeof check
        // because this comes straight from request.json() — an
        // attacker (or just a buggy client) could send a number, an
        // object, anything. Prisma's client is strict about field
        // types, so passing something non-string straight into a
        // `where: { token }` lookup could throw a confusing internal
        // error instead of a clean "invalid invite" response.
        const normalizedInviteToken =
            typeof inviteToken === "string" && inviteToken.trim() ? inviteToken.trim() : null;

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Name, email and password are required" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters long" },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: {email: email.toLowerCase()}
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "Account with this email already exists" },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Create the User AND their Workspace together, in ONE
        // transaction. Why this matters, concretely: without a
        // transaction, it's possible for the User row to be created
        // successfully, then something fails while creating the
        // Workspace (a dropped connection, a bug, anything) — leaving a
        // user who can log in, but has no workspace. Their very first
        // project-creation request would then hit
        // requireWorkspaceMembership() and fail with a confusing error,
        // for a reason that has nothing to do with what they just did.
        // Wrapping both creates in $transaction guarantees: either BOTH
        // exist when this finishes, or NEITHER does.
        const { user } = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email: email.toLowerCase(),
                    password: hashedPassword,
                },
            });

            // Same function the backfill script uses (lib/workspace.js)
            // — one definition of "what a brand-new workspace looks
            // like," reused everywhere a workspace gets created, instead
            // of copy-pasted logic that could drift out of sync.
            await createWorkspaceForUser(user.id, {
                name: `${user.name}'s Workspace`,
                db: tx,
            });

            return { user };
        });

        // SEPARATE step, deliberately outside the transaction above —
        // see the chat message before this code for why acceptInvite
        // can't be nested inside it (it needs its own advisory-locked
        // transaction, and Prisma doesn't support nesting one
        // interactive transaction inside another).
        //
        // Isolated try/catch on purpose: by this point the account and
        // personal workspace already exist and are fully valid — the
        // hard-to-redo part (password hashing, uniqueness checks) is
        // done. If joining the invited workspace fails for any reason
        // (link expired in the last few seconds, seat limit hit right
        // now, invite was revoked), that should NOT make this whole
        // signup look like it failed — that would incorrectly trigger
        // the generic 500 branch below for someone whose account was
        // actually created successfully. We log it and tell the
        // frontend via `inviteError`, but still return 201.
        let inviteError: string | null = null;
        if (normalizedInviteToken) {
            try {
                await acceptInvite(normalizedInviteToken, user.id);
            } catch (err) {
                console.error(
                    "signup: account created, but accepting the invite failed:",
                    err
                );
                inviteError =
                    err instanceof Error
                        ? err.message
                        : "Could not join the invited workspace.";
            }
        }

        return NextResponse.json(
            {
                message: "Account created successfully",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                },
                // Only present when an invite was provided AND failed —
                // absent entirely on a normal signup, so existing
                // frontend code that doesn't know about this field
                // keeps working unchanged.
                ...(inviteError ? { inviteError } : {}),
            },
            { status: 201 }
        )
    } catch (error) {
        // Correction to the original version of this route: a genuine
        // race is possible here. Two signup requests with the SAME
        // email can both arrive close enough together that both pass
        // the findUnique check above — neither sees the other yet — and
        // both then try to insert. The database's unique constraint on
        // User.email (not our app code) is what actually stops the
        // second insert, and it does so by throwing a specific error:
        // Prisma error code P2002. The original code caught this only
        // as a generic error and returned a confusing 500 "something
        // went wrong" for what is actually a completely normal,
        // expected case (duplicate signup). Catching it specifically
        // here means that race gets the SAME correct 409 response as
        // the non-race duplicate-email check above.
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { error: "Account with this email already exists" },
                { status: 409 }
            );
        }

        console.log("Signup error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
};