import createMiddleware from "next-intl/middleware";
import { routing, type Locale } from "./i18n/routing";
import { auth } from "./auth";
import { NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
  const isLoggedIn = !!req.auth;

  // Language preference priority: Cookie > JWT > Accept-Language (handled by NextIntl)
  const cookieLanguage = req.cookies.get("language-preference")
    ?.value as Locale;
  const jwtLanguage = req.auth?.user?.language as Locale;
  const preferredLanguage = cookieLanguage || jwtLanguage;

  // Handle route protection first
  const isProtectedRoute =
    req.nextUrl.pathname.includes("/my-datasets") ||
    req.nextUrl.pathname.includes("/preferences") ||
    req.nextUrl.pathname.includes("/watched") ||
    req.nextUrl.pathname.includes("/users");

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/enter", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  // For authenticated users with language preference, check if redirect needed
  if (
    isLoggedIn &&
    preferredLanguage &&
    routing.locales.includes(preferredLanguage)
  ) {
    const pathname = req.nextUrl.pathname;

    // Check if path has a locale
    const currentLocale = routing.locales.find(
      (locale) =>
        pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (currentLocale && currentLocale !== preferredLanguage) {
      // User is on wrong locale, redirect to their preference
      const newPathname = pathname.replace(
        `/${currentLocale}`,
        `/${preferredLanguage}`
      );
      const redirectUrl = new URL(newPathname, req.nextUrl.origin);
      redirectUrl.search = req.nextUrl.search;
      return NextResponse.redirect(redirectUrl);
    } else if (
      !currentLocale &&
      pathname !== "/" &&
      !pathname.startsWith("/api")
    ) {
      // User has no locale in path, redirect to their preference
      const redirectUrl = new URL(
        `/${preferredLanguage}${pathname}`,
        req.nextUrl.origin
      );
      redirectUrl.search = req.nextUrl.search;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return intlMiddleware(req);
});

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
