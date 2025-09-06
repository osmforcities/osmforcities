"use client";

import { Link } from "@/i18n/navigation";
import NavButton from "@/components/ui/nav-button";

interface NavActionsProps {
  isLoggedIn: boolean;
  translations: {
    about: string;
    preferences: string;
    signOut: string;
    signIn: string;
  };
}

export default function NavActions({ isLoggedIn, translations }: NavActionsProps) {
  if (isLoggedIn) {
    return (
      <>
        <NavButton variant="ghost">
          <Link href="/about">{translations.about}</Link>
        </NavButton>
        <NavButton variant="ghost">
          <Link href="/preferences">{translations.preferences}</Link>
        </NavButton>
        <form action="/api/auth/logout" method="POST">
          <NavButton type="submit" variant="secondary">
            {translations.signOut}
          </NavButton>
        </form>
      </>
    );
  }

  return (
    <>
      <NavButton variant="ghost">
        <Link href="/about">{translations.about}</Link>
      </NavButton>
      <NavButton variant="default">
        <Link href="/enter">{translations.signIn}</Link>
      </NavButton>
    </>
  );
}