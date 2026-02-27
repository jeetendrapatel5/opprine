import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },

            async authorize(credentials) {
                if (!credentials?.email || !credentials.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email.toLowerCase() }
                })

                if (!user) return null;
                
                const passwordMatch = await bcrypt.compare(
                    credentials.password,
                    user.password
                )

                if (!passwordMatch) return null;

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    plan: user.plan
                }
            }
        })
    ],

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.plan = user.plan
            }
            return token;
        },

        async session ({ session, token }) {
            if (token) {
                session.user.id = token.id
                session.user.plan = token.plan
            }
            return session;
        }
    },

    session: {
        strategy: "jwt"
    },

    pages: {
        signIn: "/signin"
    },

    secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };