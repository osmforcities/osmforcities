import { Suspense } from "react";
import { HeroLayout, HeroContent } from "../hero";
import { HeroMap } from "../shared/hero-map";
import { FeaturedDatasetMap } from "../shared/featured-dataset-map";

export function Hero() {
  return (
    <HeroLayout>
      <HeroContent />
      <Suspense fallback={<HeroMap />}>
        <FeaturedDatasetMap />
      </Suspense>
    </HeroLayout>
  );
}
