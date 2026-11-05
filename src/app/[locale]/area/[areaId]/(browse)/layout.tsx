import { Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AreaBrowse, AreaBrowseSkeleton } from "@/components/area/area-browse";
import { AreaFacts } from "@/components/area/area-facts";
import { TrackView } from "@/components/analytics/track-view";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { resolveAreaName } from "@/lib/area-name";
import { parseAreaIdOrNotFound } from "@/lib/area-route";
import { getActiveTemplates } from "@/lib/area-templates";
import { getAreaDetailsById } from "@/lib/nominatim";

export const revalidate = 3600;

type AreaBrowseLayoutProps = {
  children: ReactNode;
  params: Promise<{ areaId: string }>;
};

export default function AreaBrowseLayout({ children, params }: AreaBrowseLayoutProps) {
  return (
    <Suspense fallback={<AreaBrowseSkeleton />}>
      <AreaBrowseShell params={params}>{children}</AreaBrowseShell>
    </Suspense>
  );
}

async function AreaBrowseShell({ children, params }: AreaBrowseLayoutProps) {
  const { areaId } = await params;
  const osmRelationId = parseAreaIdOrNotFound(areaId);
  const locale = await getLocale();
  const navT = await getTranslations("Navigation");

  const [areaInfo, templates, session] = await Promise.all([
    getAreaDetailsById(osmRelationId, locale),
    getActiveTemplates(locale),
    auth(),
  ]);
  if (!areaInfo) notFound();

  const areaName = resolveAreaName(areaInfo, locale);
  // A state can share the area's name (Mexico City), which would repeat the title
  const parentBreadcrumb = [
    { label: navT("home"), href: "/" },
    ...[areaInfo.country, areaInfo.state]
      .filter((place): place is string => Boolean(place) && place !== areaName)
      .map((place) => ({ label: place })),
  ];

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
        facts={<AreaFacts area={areaInfo} />}
        templates={templates}
      >
        {children}
      </AreaBrowse>
    </>
  );
}
