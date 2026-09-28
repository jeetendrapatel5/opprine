import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createWorkspaceForUser } from "@/lib/workspace";
import { acceptInvite } from "@/lib/invites";
import { NotFoundError, ForbiddenError, LimitExceededError } from "@/lib/errors";

// Simple "does this look like an email" check: something@something.something
// with no spaces. It does not prove the address exists, it only blocks junk.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254; // the practical maximum length of an email address

// bcrypt only reads the first 72 bytes of a password. Anything after that is
// silently ignored, so we reject longer passwords instead of pretending the
// whole thing was used.
const MAX_PASSWORD_BYTES = 72;

export async function POST(request: Request) {
    try {
        // Reading the body can itself throw (empty body, broken JSON).
        // That is the client's mistake, so we answer 400, not 500.
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Request body must be valid JSON" },
                { status: 400 }
            );
        }

        // `?? {}` protects against a body of literally `null`, which would
        // crash the destructuring on the next line.
        const { name, email, password, inviteToken } = (body ?? {}) as Record<
            string,
            unknown
        >;

        // Everything here comes straight from the network, so nothing can be
        // trusted to be a string. A number or object would crash .toLowerCase()
        // or slip past .length. Check the type first, once, for every field.
        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return NextResponse.json(
                { error: "Name, email and password are required" },
                { status: 400 }
            );
        }

        const trimmedName = name.trim();
        // Trim + lowercase so " Jeetu@Mail.com " and "jeetu@mail.com" are the
        // same account.
        const normalizedEmail = email.trim().toLowerCase();

        if (!trimmedName || !normalizedEmail || !password) {
            return NextResponse.json(
                { error: "Name, email and password are required" },
                { status: 400 }
            );
        }

        if (trimmedName.length > MAX_NAME_LENGTH) {
            return NextResponse.json(
                { error: `Name must be at most ${MAX_NAME_LENGTH} characters long` },
                { status: 400 }
            );
        }

        if (
            normalizedEmail.length > MAX_EMAIL_LENGTH ||
            !EMAIL_PATTERN.test(normalizedEmail)
        ) {
            return NextResponse.json(
                { error: "Please enter a valid email address" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters long" },
                { status: 400 }
            );
        }

        if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
            return NextResponse.json(
                { error: "Password is too long (maximum 72 bytes)" },
                { status: 400 }
            );
        }

        // Optional invite token. Same idea as above: only accept a real,
        // non-empty string, otherwise treat it as "no invite".
        const normalizedInviteToken =
            typeof inviteToken === "string" && inviteToken.trim()
                ? inviteToken.trim()
                : null;

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Account with this email already exists" },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Create the User AND their Workspace in ONE transaction: either
        // BOTH exist when this finishes, or NEITHER does. Without it, a
        // failure between the two creates would leave a user who can log in
        // but has no workspace.
        //
        // `tx` needs no type annotation: lib/prisma.js now gives `prisma` a
        // real type, so TypeScript works out `tx` by itself. If someone ever
        // breaks that typing again, this line fails the build loudly instead
        // of silently going untyped.
        const { user } = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: trimmedName,
                    email: normalizedEmail,
                    password: hashedPassword,
                },
            });

            // Same function the backfill script uses (lib/workspace.js),
            // so "what a new workspace looks like" is defined in one place.
            await createWorkspaceForUser(user.id, {
                name: `${user.name}'s Workspace`,
                db: tx,
            });

            return { user };
        });

        // SEPARATE step, deliberately outside the transaction above.
        // acceptInvite needs its own advisory-locked transaction, and Prisma
        // cannot nest one interactive transaction inside another.
        //
        // Own try/catch on purpose: the account and personal workspace are
        // already saved and valid. If joining the invited workspace fails
        // (link expired, seat limit hit, invite revoked, invite sent to a
        // different email), signup should still count as a success. We log
        // it and tell the frontend through `inviteError`, but still return 201.
        let inviteError: string | null = null;
        if (normalizedInviteToken) {
            try {
                await acceptInvite(normalizedInviteToken, user.id);
            } catch (err) {
                console.error(
                    "signup: account created, but accepting the invite failed:",
                    err
                );
                // Only show the browser messages WE wrote on purpose (these
                // three error types). Anything else, such as a database
                // error, can contain internal details, so it gets a
                // generic message instead.
                inviteError =
                    err instanceof NotFoundError ||
                    err instanceof ForbiddenError ||
                    err instanceof LimitExceededError
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
                    email: user.email,
                },
                // Only present when an invite was provided AND failed, so
                // frontends that don't know about this field keep working.
                ...(inviteError ? { inviteError } : {}),
            },
            { status: 201 }
        );
    } catch (error) {
        // Race condition: two signups with the SAME email can both pass the
        // findUnique check above before either has inserted. The database's
        // unique constraint on User.email stops the second insert by throwing
        // Prisma error P2002. That is a normal duplicate signup, so it gets
        // the same 409 as the non-race case, not a 500.
        //
        // Safe to assume it's the email: the only other rows created in that
        // transaction (Workspace, WorkspaceMember) use brand-new ids, so
        // they can't collide.
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { error: "Account with this email already exists" },
                { status: 409 }
            );
        }

        console.error("Signup error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}