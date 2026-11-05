import { useTranslations } from "next-intl";
import { Link } from "@/components/ui/link";
import { wikipediaUrl } from "@/lib/area-conversion";
import type { MessageResolver } from "@/lib/tag-i18n";
import { getAreaCharacteristics } from "@/lib/utils";
import type { Area } from "@/types/area";

type AreaFactsProps = {
  area: Area;
  /** Places above the area, never the area itself. */
  parentPlaces: string[];
};

export function AreaFacts({ area, parentPlaces }: AreaFactsProps) {
  const t = useTranslations("AreaFacts");
  // Nominatim address types are open-ended, so they can't be checked against literal message keys
  const translateAddressType = useTranslations("AddressTypes") as unknown as MessageResolver;

  const placeType = area.isCapital
    ? t("capitalCity")
    : getAreaCharacteristics(area, translateAddressType)[0];
  const facts = [
    [placeType, parentPlaces.join(", ")].filter(Boolean).join(" · "),
    area.population !== undefined &&
      (area.populationYear
        ? t("populationIn", { count: area.population, year: area.populationYear })
        : t("population", { count: area.population })),
    area.elevation !== undefined && t("elevation", { elevation: area.elevation }),
  ].filter(Boolean);

  const links = [
    { label: t("openStreetMap"), href: `https://www.openstreetmap.org/relation/${area.id}` },
    area.wikipedia && { label: t("wikipedia"), href: wikipediaUrl(area.wikipedia) },
    area.wikidata && { label: t("wikidata"), href: `https://www.wikidata.org/wiki/${area.wikidata}` },
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  return (
    <div className="flex flex-col gap-2 text-sm text-gray-600">
      {facts.length > 0 && <p data-testid="area-facts">{facts.join(" · ")}</p>}
      <ul aria-label={t("links")} className="flex flex-wrap gap-x-4 gap-y-1">
        {links.map(({ label, href }) => (
          <li key={label}>
            <Link href={href} size="sm">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
