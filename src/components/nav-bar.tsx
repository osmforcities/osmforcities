import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserFromCookie } from "@/lib/auth";

export default async function NavBar() {
  const user = await getUserFromCookie();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-xl font-bold transition-colors hover:text-foreground/80"
          >
            <span>OSM for Cities</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? <LoggedInNav /> : <LoggedOutNav />}
          </div>
        </div>
      </div>
    </nav>
  );
}

function LoggedInNav() {
  return (
    <>
      <Button variant="ghost" asChild>
        <Link href="/about">About</Link>
      </Button>
      <form action="/api/auth/logout" method="POST">
        <Button type="submit" variant="outline" size="sm">
          Sign Out
        </Button>
      </form>
    </>
  );
}

function LoggedOutNav() {
  return (
    <>
      <Button variant="ghost" asChild>
        <Link href="/about">About</Link>
      </Button>
      <Button asChild>
        <Link href="/enter">Sign In</Link>
      </Button>
    </>
  );
}
