import createMiddleware from "next-intl/middleware";
import { routing, type Locale } from "./i18n/routing";
import { auth } from "./auth";
import { NextResponse, type NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

function isValidLocalePath(pathname: string): boolean {
  return routing.locales.some((loc) => pathname.startsWith(`/${loc}`));
}

// New middleware pattern to bypass the auth() wrapper
export default async function middleware(req: NextRequest) {
  const session = await auth();
  const isLoggedIn = !!session;
  const pathname = req.nextUrl.pathname;

  // Add debug headers to every response
  const addDebugHeaders = (response: NextResponse) => {
    response.headers.set("X-Debug-Auth", isLoggedIn ? "true" : "false");
    response.headers.set("X-Debug-Path", pathname);
    response.headers.set(
      "X-Debug-User-Language",
      session?.user?.language || "none"
    );
    response.headers.set(
      "X-Debug-Cookie-Language",
      req.cookies.get("language-preference")?.value || "none"
    );
    return response;
  };

  // Handle route protection first
  const isProtectedRoute =
    pathname.includes("/my-datasets") ||
    pathname.includes("/preferences") ||
    pathname.includes("/watched") ||
    pathname.includes("/users");

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/enter", req.nextUrl.origin);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set("X-Debug-Redirect", "login-redirect");
    return addDebugHeaders(redirectResponse);
  }

  // Language preference logic for logged-in users
  if (isLoggedIn && session?.user?.language) {
    const preferredLanguage = session.user.language as Locale;
    const currentLocale = routing.locales.find(
      (locale) =>
        pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (currentLocale && currentLocale !== preferredLanguage) {
      const newPathname = pathname.replace(
        `/${currentLocale}`,
        `/${preferredLanguage}`
      );
      if (isValidLocalePath(newPathname)) {
        const redirectUrl = new URL(newPathname, req.nextUrl.origin);
        redirectUrl.search = req.nextUrl.search;
        return addDebugHeaders(NextResponse.redirect(redirectUrl));
      }
    }
  }

  // Fallback to intl middleware
  const response = intlMiddleware(req);
  return addDebugHeaders(response);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
