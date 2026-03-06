import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

const authRoutes = ["/login", "/register", "/student/login", "/student/register", "/educator/login", "/educator/register"];

export default auth(async (req) => {
    const isLoggedIn = !!req.auth;
    const { nextUrl } = req;

    const isAuthRoute = authRoutes.includes(nextUrl.pathname);

    // If logged in: Redirect auth screens to their respective portal or home based on onboarding
    if (isLoggedIn && isAuthRoute) {
        return Response.redirect(new URL("/dashboard", nextUrl));
    }

});
