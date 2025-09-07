"use client";

import { Link } from "@/i18n/navigation";

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
  const linkClass = isMobile
    ? "w-full px-4 py-4 text-left font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset text-gray-700 hover:text-gray-900 hover:bg-blue-200"
    : "px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-gray-700 hover:text-gray-900 hover:bg-blue-200";

  if (isLoggedIn) {
    return (
      <div className={containerClass}>
        <Link href="/about" className={linkClass}>
          {translations.about}
        </Link>
        <Link href="/preferences" className={linkClass}>
          {translations.preferences}
        </Link>
        <form
          action="/api/auth/logout"
          method="POST"
          className={isMobile ? "w-full" : ""}
        >
          <button
            type="submit"
            className={
              isMobile
                ? "w-full px-4 py-4 text-left font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset text-gray-700 hover:bg-red-100 hover:text-red-700 cursor-pointer"
                : `${linkClass} bg-white border border-gray-200 hover:bg-blue-200 hover:text-gray-900`
            }
          >
            {translations.signOut}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <Link href="/about" className={linkClass}>
        {translations.about}
      </Link>
      <Link
        href="/enter"
        className={`${linkClass} bg-blue-500 text-white hover:bg-blue-600`}
      >
        {translations.signIn}
      </Link>
    </div>
  );
}
