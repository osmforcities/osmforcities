import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OSM for Cities - Monitor OpenStreetMap Datasets",
  description:
    "Track changes in OpenStreetMap datasets across cities worldwide.",
};

export default async function Home() {
  const user = await getUserFromCookie();

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="w-full max-w-2xl text-center p-4 space-y-8">
          <h1 className="text-5xl font-bold text-black dark:text-white mb-4">
            OSM for Cities
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Track and follow OpenStreetMap updates in places you care about.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/about">Learn More</Link>
            </Button>
            <Button size="lg" asChild>
              <Link href="/enter">Enter</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to the watched tab by default
  redirect("/watched");
}
