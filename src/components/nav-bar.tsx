import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserFromCookie } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

export default async function NavBar() {
  const user = await getUserFromCookie();
  const t = await getTranslations("Navigation");

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-xl font-bold transition-colors hover:text-foreground/80"
          >
            <span>{t("brandName")}</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? <LoggedInNav t={t} /> : <LoggedOutNav t={t} />}
          </div>
        </div>
      </div>
    </nav>
  );
}

function LoggedInNav({ t }: { t: (key: string) => string }) {
  return (
    <>
      <Button variant="ghost" asChild>
        <Link href="/about">{t("about")}</Link>
      </Button>
      <Button variant="ghost" asChild>
        <Link href="/preferences" className="flex items-center gap-2">
          {t("preferences")}
        </Link>
      </Button>
      <form action="/api/auth/logout" method="POST">
        <Button type="submit" variant="outline" size="sm">
          {t("signOut")}
        </Button>
      </form>
    </>
  );
}

function LoggedOutNav({ t }: { t: (key: string) => string }) {
  return (
    <>
      <Button variant="ghost" asChild>
        <Link href="/about">{t("about")}</Link>
      </Button>
      <Button asChild>
        <Link href="/enter">{t("signIn")}</Link>
      </Button>
    </>
  );
}
