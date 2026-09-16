import { Locale } from "next-intl";
import {
  ExploreSectionPage,
  exploreSectionMetadata,
} from "@/components/explore/explore-section-page";

export const revalidate = 300;

export function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return exploreSectionMetadata("featured", params);
}

export default function FeaturedPage({ params }: { params: Promise<{ locale: Locale }> }) {
  return <ExploreSectionPage section="featured" params={params} />;
}
