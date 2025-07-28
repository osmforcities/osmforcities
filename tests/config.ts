import { routing } from "@/i18n/routing";

// Safety check: ensure we're running against a test database
const dbUrl = new URL(process.env.DATABASE_URL!);
if (!dbUrl.pathname.slice(1).includes("-test")) {
  throw new Error(
    `Refusing to run tests on database "${dbUrl.pathname.slice(
      1
    )}". It does not appear to be a test database (name should contain "-test").`
  );
}

export const locale = routing.defaultLocale;

export const getLocalizedPath = (path: string) => {
  if (path.startsWith("/api")) {
    return path;
  }

  const [pathname, search] = path.split("?");

  // Handle root path specially
  if (pathname === "/") {
    const localizedPath = `/${locale}`;
    return search ? `${localizedPath}?${search}` : localizedPath;
  }

  const localizedPath = `/${locale}${pathname}`;
  return search ? `${localizedPath}?${search}` : localizedPath;
};
