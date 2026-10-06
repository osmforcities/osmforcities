import { auth } from "@/auth";
import { NavBarView } from "@/components/nav-bar-view";

/** Resolves the session, then renders the bar. */
export default async function NavBar() {
  const session = await auth();
  return <NavBarView isLoggedIn={!!session?.user} />;
}
