import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { auth } from "./auth";
import { NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
  const isLoggedIn = !!req.auth;

  const isProtectedRoute =
    req.nextUrl.pathname.includes("/my-datasets") ||
    req.nextUrl.pathname.includes("/preferences") ||
    req.nextUrl.pathname.includes("/watched") ||
    req.nextUrl.pathname.includes("/users");

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/enter", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(req);
});

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
