import { HeroLayout, HeroContent } from "../hero";
import { HeroMap } from "../shared/hero-map";

export function Hero() {
  return (
    <HeroLayout>
      <HeroContent />
      <HeroMap />
    </HeroLayout>
  );
}
