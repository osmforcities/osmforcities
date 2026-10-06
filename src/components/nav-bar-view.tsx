import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Home } from "lucide-react";
import HamburgerMenu from "@/components/hamburger-menu";
import NavSearch from "@/components/nav-search";

/**
 * The navigation bar with the session already resolved. Kept apart from the
 * auth call so page stories can render the real chrome in the browser, where
 * next-auth and Prisma cannot load. Brand link always goes to / (home).
 */
export function NavBarView({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useTranslations("Navigation");

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
      <div className="w-full px-3 md:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center text-lg md:text-xl font-bold text-gray-900 transition-colors hover:text-gray-700"
            aria-label={t("brandName")}
          >
            {/* Mobile: Home icon button */}
            <div className="md:hidden p-3 rounded text-gray-600 hover:text-gray-900 hover:bg-olive-100 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2">
              <Home size={28} />
            </div>
            {/* Desktop: Brand name */}
            <span className="hidden md:inline">{t("brandName")}</span>
          </Link>

          <div className="flex items-center gap-4 flex-1 justify-center max-w-md mx-2 md:mx-8">
            <NavSearch />
          </div>

          <HamburgerMenu isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </nav>
  );
}
