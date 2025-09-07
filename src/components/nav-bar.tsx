import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import HamburgerMenu from "@/components/hamburger-menu";
import NavSearch from "@/components/nav-search";

export default async function NavBar() {
  const session = await auth();
  const user = session?.user || null;
  const t = await getTranslations("Navigation");

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
      <div className="w-full max-w-7xl mx-auto px-2 md:px-4">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center text-lg md:text-xl font-bold text-gray-900 transition-colors hover:text-gray-700"
          >
            <span>{t("brandName")}</span>
          </Link>

          <div className="flex items-center gap-4 flex-1 justify-center max-w-md mx-2 md:mx-8">
            <NavSearch />
          </div>

          <HamburgerMenu
            isLoggedIn={!!user}
            translations={{
              about: t("about"),
              preferences: t("preferences"),
              signOut: t("signOut"),
              signIn: t("signIn"),
            }}
          />
        </div>
      </div>
    </nav>
  );
}
