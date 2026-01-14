import { getTranslations } from "next-intl/server";
import ClientMenu from "@/components/client-menu";
import NavActions from "@/components/nav-actions";

interface HamburgerMenuProps {
  isLoggedIn: boolean;
}

/**
 * Server component wrapper - handles desktop translations
 * Mobile translations handled by client component using useTranslations hook
 */
export default async function HamburgerMenu({ isLoggedIn }: HamburgerMenuProps) {
  const t = await getTranslations("Navigation");

  return (
    <>
      {/* Mobile Menu - Client Component with own translations */}
      <div className="md:hidden">
        <ClientMenu isLoggedIn={isLoggedIn} />
      </div>

      {/* Desktop Actions (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-4">
        <NavActions
          isLoggedIn={isLoggedIn}
          translations={{
            dashboard: t("dashboard"),
            about: t("about"),
            preferences: t("preferences"),
            signOut: t("signOut"),
            signIn: t("signIn"),
          }}
          isMobile={false}
        />
      </div>
    </>
  );
}
