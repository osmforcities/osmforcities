import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AreaBrowse } from "@/components/area/area-browse";
import { TrackView } from "@/components/analytics/track-view";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { resolveAreaName } from "@/lib/area-name";
import { parseAreaIdOrNotFound } from "@/lib/area-route";
import { getAreaDataTypes } from "@/lib/area-templates";
import { getAreaDetailsById } from "@/lib/nominatim";

export const revalidate = 3600;

type AreaBrowseLayoutProps = {
  children: ReactNode;
  params: Promise<{ areaId: string }>;
};

export default async function AreaBrowseLayout({
  children,
  params,
}: AreaBrowseLayoutProps) {
  const { areaId } = await params;
  const osmRelationId = parseAreaIdOrNotFound(areaId);
  const locale = await getLocale();
  const navT = await getTranslations("Navigation");

  const [areaInfo, templates, session] = await Promise.all([
    getAreaDetailsById(osmRelationId, locale),
    getAreaDataTypes(osmRelationId, locale),
    auth(),
  ]);
  if (!areaInfo) notFound();

  const areaName = resolveAreaName(areaInfo, locale);
  // A state can share the area's name (Mexico City), which would repeat the title
  const parentBreadcrumb = [
    { label: navT("home"), href: "/" },
    { label: areaInfo.country || "Area" },
    ...(areaInfo.state ? [{ label: areaInfo.state }] : []),
  ].filter(({ label }) => label !== areaName);

  return (
    <>
      <TrackView
        event={
          session?.user
            ? ANALYTICS_EVENTS.AREA_VIEW_LOGGED_IN
            : ANALYTICS_EVENTS.AREA_VIEW_LOGGED_OUT
        }
        url={`/area/${areaId}/view`}
      />
      <AreaBrowse
        areaId={areaId}
        areaName={areaName}
        parentBreadcrumb={parentBreadcrumb}
        templates={templates}
      >
        {children}
      </AreaBrowse>
    </>
  );
}
