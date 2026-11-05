import Image from "next/image";
import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/ui/link";
import { commonsImageUrl, wikipediaUrl } from "@/lib/area-conversion";
import type { MessageResolver } from "@/lib/tag-i18n";
import { getAreaCharacteristics } from "@/lib/utils";
import type { Area } from "@/types/area";

/** `flag` is a Wikimedia Commons file name. */
export function AreaFlag({ flag }: { flag: string }) {
  return (
    // Fixed width, stretched height: the text block sets the height and the flag scales into it
    <div className="relative w-[30%] max-w-48 shrink-0">
      <Image
        src={commonsImageUrl(flag, 320)}
        alt=""
        fill
        unoptimized
        data-testid="area-flag"
        className="object-contain object-right-top"
      />
    </div>
  );
}

export function AreaFacts({ area }: { area: Area }) {
  const t = useTranslations("AreaFacts");
  // Nominatim address types are open-ended, so they can't be checked against literal message keys
  const translateAddressType = useTranslations("AddressTypes") as unknown as MessageResolver;

  const placeType = area.isCapital
    ? t("capitalCity")
    : getAreaCharacteristics(area, translateAddressType)[0];
  const facts = [
    placeType,
    area.population !== undefined &&
      [t("population", { count: area.population }), area.populationYear && `(${area.populationYear})`]
        .filter(Boolean)
        .join(" "),
    area.elevation !== undefined && t("elevation", { elevation: area.elevation }),
  ].filter((fact): fact is string => Boolean(fact));

  const links = [
    area.website && { label: t("website"), href: area.website },
    { label: t("openStreetMap"), href: `https://www.openstreetmap.org/relation/${area.id}` },
    area.wikipedia && { label: t("wikipedia"), href: wikipediaUrl(area.wikipedia) },
    area.wikidata && { label: t("wikidata"), href: `https://www.wikidata.org/wiki/${area.wikidata}` },
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  return (
    <div className="flex flex-col gap-2 text-sm text-gray-600">
      {facts.length > 0 && (
        <p data-testid="area-facts">
          {facts.map((fact, index) => (
            <Fragment key={fact}>
              {index > 0 && " · "}
              <span className="whitespace-nowrap">{fact}</span>
            </Fragment>
          ))}
        </p>
      )}
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
