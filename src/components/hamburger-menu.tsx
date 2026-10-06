import { useTranslations } from "next-intl";
import ClientMenu from "@/components/client-menu";
import NavActions from "@/components/nav-actions";

interface HamburgerMenuProps {
  isLoggedIn: boolean;
}

/**
 * Desktop actions get their translations here; the mobile menu is a client
 * component that reads its own.
 */
export default function HamburgerMenu({ isLoggedIn }: HamburgerMenuProps) {
  const t = useTranslations("Navigation");

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
            explore: t("explore"),
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
