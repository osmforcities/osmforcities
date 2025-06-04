import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function getUser() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return null;
    }

    const session = await findSessionByToken(sessionToken);

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.user;
  } catch (error) {
    return null;
  }
}

export default async function NavBar() {
  const user = await getUser();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* App Title */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center space-x-2 text-xl font-bold transition-colors hover:text-foreground/80"
            >
              <span>OSM for Cities</span>
            </Link>
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button type="submit" variant="outline" size="sm" asChild>
                  <form
                    action="/api/auth/logout"
                    method="POST"
                    className="inline"
                  >
                    <button type="submit">Sign Out</button>
                  </form>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/enter">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
