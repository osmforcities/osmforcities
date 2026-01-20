/**
 * Home/Landing page - public facing marketing page
 * Always shows landing content (Hero, Features, Use Cases, etc.)
 * Authenticated users should go to /dashboard for their dashboard
 */

import { Metadata } from "next";
import { auth } from "@/auth";
import { Hero } from "@/components/home/sections/hero";
import { Features } from "@/components/home/sections/features";
import { DatasetShowcase } from "@/components/home/sections/dataset-showcase";
import { UseCases } from "@/components/home/sections/use-cases";
import { FinalCTA } from "@/components/home/sections/final-cta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OSM for Cities - Monitor OpenStreetMap Datasets",
  description:
    "Track changes in OpenStreetMap datasets across cities worldwide.",
};

export default async function Home() {
  const session = await auth();
  const isAuthenticated = !!session?.user;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Hero />
      <Features />
      <UseCases />
      <DatasetShowcase />
      {!isAuthenticated && <FinalCTA />}
    </div>
  );
}
