import { Suspense } from "react";
import { HeroLayout, HeroContent } from "../hero";
import { HeroMap } from "../shared/hero-map";
import { FeaturedDatasetMap } from "../shared/featured-dataset-map";

export function Hero() {
  return (
    <HeroLayout>
      <HeroContent />
      {/* Explicit wrapper so the grid always has exactly two element
          children — Suspense streaming placeholders would otherwise become
          extra grid items and wrap under the left column */}
      <div className="relative h-full">
        <Suspense fallback={<HeroMap />}>
          <FeaturedDatasetMap />
        </Suspense>
      </div>
    </HeroLayout>
  );
}
