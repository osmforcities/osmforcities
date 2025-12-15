"use client";

import { NavLink, NavButton } from "@/components/ui/nav-link";

interface NavActionsProps {
  isLoggedIn: boolean;
  translations: {
    about: string;
    preferences: string;
    signOut: string;
    signIn: string;
  };
  isMobile?: boolean;
}

export default function NavActions({
  isLoggedIn,
  translations,
  isMobile = false,
}: NavActionsProps) {
  const containerClass = isMobile
    ? "flex flex-col divide-y divide-gray-300"
    : "flex items-center gap-4";

  if (isLoggedIn) {
    return (
      <div className={containerClass}>
        <NavLink href="/about" isMobile={isMobile}>
          {translations.about}
        </NavLink>
        <NavLink href="/preferences" isMobile={isMobile}>
          {translations.preferences}
        </NavLink>
        <form
          action="/api/auth/logout"
          method="POST"
          className={isMobile ? "w-full" : ""}
        >
          <NavButton type="submit" isMobile={isMobile} variant="destructive">
            {translations.signOut}
          </NavButton>
        </form>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <NavLink href="/about" isMobile={isMobile}>
        {translations.about}
      </NavLink>
      <NavLink href="/enter" isMobile={isMobile} variant="primary" data-testid="navbar-sign-in">
        {translations.signIn}
      </NavLink>
    </div>
  );
}
