import createMiddleware from "next-intl/middleware";
import { routing, type Locale } from "./i18n/routing";
import { auth } from "./auth";
import { NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

function isValidLocalePath(pathname: string): boolean {
  return routing.locales.some(loc => pathname.startsWith(`/${loc}`));
}

// Add back authentication with extensive debugging
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;

  // Add debug headers to every response
  const addDebugHeaders = (response: NextResponse) => {
    response.headers.set("X-Debug-Auth", isLoggedIn ? "true" : "false");
    response.headers.set("X-Debug-Path", pathname);
    response.headers.set("X-Debug-User-Language", req.auth?.user?.language || "none");
    response.headers.set("X-Debug-Cookie-Language", req.cookies.get("language-preference")?.value || "none");
    return response;
  };

  // Handle route protection first
  const isProtectedRoute =
    pathname.includes("/my-datasets") ||
    pathname.includes("/preferences") ||
    pathname.includes("/watched") ||
    pathname.includes("/users");

  if (isProtectedRoute && !isLoggedIn) {
    console.log(`[MIDDLEWARE] Protected route ${pathname} - redirecting to login`);
    const loginUrl = new URL("/enter", req.nextUrl.origin);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set("X-Debug-Redirect", "login-redirect");
    return addDebugHeaders(redirectResponse);
  }

  // For authenticated users with language preference, check if redirect needed
  if (isLoggedIn) {
    const jwtLanguage = req.auth?.user?.language as Locale;
    const cookieLanguage = req.cookies.get("language-preference")?.value as Locale;
    const preferredLanguage = cookieLanguage || jwtLanguage;

    console.log(`[MIDDLEWARE] User logged in, preferred language: ${preferredLanguage}`);

    if (preferredLanguage && routing.locales.includes(preferredLanguage)) {
      // Check if path has a locale
      const currentLocale = routing.locales.find(
        (locale) =>
          pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
      );

      console.log(`[MIDDLEWARE] Current locale: ${currentLocale}, preferred: ${preferredLanguage}`);

      if (currentLocale && currentLocale !== preferredLanguage) {
        // User is on wrong locale, redirect to their preference
        const newPathname = pathname.replace(
          `/${currentLocale}`,
          `/${preferredLanguage}`
        );
        
        console.log(`[MIDDLEWARE] Redirecting from ${pathname} to ${newPathname}`);
        
        // Validate the redirect path before redirecting
        if (isValidLocalePath(newPathname)) {
          const redirectUrl = new URL(newPathname, req.nextUrl.origin);
          redirectUrl.search = req.nextUrl.search;
          const redirectResponse = NextResponse.redirect(redirectUrl);
          redirectResponse.headers.set("X-Debug-Redirect", `locale-redirect:${currentLocale}->${preferredLanguage}`);
          return addDebugHeaders(redirectResponse);
        } else {
          console.log(`[MIDDLEWARE] Invalid redirect path: ${newPathname}`);
          const response = NextResponse.next();
          response.headers.set("X-Debug-Redirect", "invalid-path-skip");
          return addDebugHeaders(response);
        }
      } else if (
        !currentLocale &&
        pathname !== "/" &&
        !pathname.startsWith("/api")
      ) {
        // User has no locale in path, redirect to their preference
        const redirectPath = `/${preferredLanguage}${pathname}`;
        
        console.log(`[MIDDLEWARE] Adding locale to path: ${pathname} -> ${redirectPath}`);
        
        // Validate the redirect path before redirecting
        if (isValidLocalePath(redirectPath)) {
          const redirectUrl = new URL(redirectPath, req.nextUrl.origin);
          redirectUrl.search = req.nextUrl.search;
          const redirectResponse = NextResponse.redirect(redirectUrl);
          redirectResponse.headers.set("X-Debug-Redirect", `add-locale:${preferredLanguage}`);
          return addDebugHeaders(redirectResponse);
        } else {
          console.log(`[MIDDLEWARE] Invalid add-locale path: ${redirectPath}`);
          const response = NextResponse.next();
          response.headers.set("X-Debug-Redirect", "invalid-add-locale-skip");
          return addDebugHeaders(response);
        }
      }
    }
  }

  // If we reach here, use the intl middleware
  console.log(`[MIDDLEWARE] Using intl middleware for path: ${pathname}`);
  const response = intlMiddleware(req);
  return addDebugHeaders(response);
});

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
