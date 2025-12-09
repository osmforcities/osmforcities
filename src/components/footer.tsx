import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GITHUB_REPO_URL, CONTACT_FORM_URL } from "@/lib/constants";

export default async function Footer() {
  const t = await getTranslations("Home.footer");
  const navT = await getTranslations("Navigation");

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-4 py-12 md:py-18 lg:py-20">
      <div className="container mx-auto">
        <div className="flex flex-col items-center justify-between gap-8 pb-12 md:pb-18 lg:flex-row lg:gap-y-4 lg:pb-20">
          <Link
            href="/"
            className="text-lg font-bold text-gray-900 dark:text-white"
          >
            {navT("brandName")}
          </Link>
          <ul className="flex flex-wrap items-center justify-center gap-6">
            <li className="font-semibold">
              <Link
                href="/about"
                className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-400"
              >
                {t("about")}
              </Link>
            </li>
            <li className="font-semibold">
              <a
                href={CONTACT_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-400"
              >
                {t("contact")}
              </a>
            </li>
            <li className="font-semibold">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-400"
              >
                {t("github")}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
