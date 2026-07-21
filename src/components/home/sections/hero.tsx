import { Suspense } from "react";
import { HeroLayout, HeroContent } from "../hero";
import { HeroMap } from "../shared/hero-map";
import { FeaturedDatasetMap } from "../shared/featured-dataset-map";

export function Hero() {
  return (
    <HeroLayout>
      <HeroContent />
      {/* Wrapper keeps Suspense streaming placeholders from becoming
          extra grid items that wrap under the left column */}
      <div className="relative h-full">
        <Suspense fallback={<HeroMap />}>
          <FeaturedDatasetMap />
        </Suspense>
      </div>
    </HeroLayout>
  );
}
