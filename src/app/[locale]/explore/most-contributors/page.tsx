import { Locale } from "next-intl";
import {
  ExploreSectionPage,
  exploreSectionMetadata,
} from "@/components/explore/explore-section-page";

export const revalidate = 300;

export function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return exploreSectionMetadata("mostContributors", params);
}

export default function MostContributorsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  return <ExploreSectionPage section="mostContributors" params={params} />;
}
