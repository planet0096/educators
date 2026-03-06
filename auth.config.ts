import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.onboardingCompleted = (user as any).onboardingCompleted;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                (session.user as any).role = token.role as string;
                (session.user as any).onboardingCompleted = token.onboardingCompleted as boolean;
            }
            return session;
        },
    },
    providers: [], // Providers are defined in auth.ts to avoid Edge API issues with bcrypt/mongoose
    secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
