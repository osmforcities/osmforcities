import type { ReactNode } from "react";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { AreaBasemap } from "@/components/dataset/area-basemap";

const LEAD_TONE = {
  neutral: "text-gray-900",
  processing: "text-gray-900",
  warning: "text-orange-600",
  error: "text-red-600",
} as const;

type DatasetNoMapPageProps = {
  /** The area the basemap frames. */
  areaId: number | string;
  categoryHref: string;
  /** The subject only, "{dataset} in {area}". It never changes while the page waits. */
  title: string;
  /** The state, tinted by tone: "Bake failed.", "No data yet.". The waiting
   *  screens leave it out; their progress block says it. */
  lead?: string;
  /** The progress block (stage and bar) of a waiting screen. */
  progress?: ReactNode;
  /** What happened and what the person can do about it. The waiting screens
   *  leave it out; the progress block says everything. */
  description?: ReactNode;
  tone?: keyof typeof LEAD_TONE;
  /** The save control, above the disabled rest of the map page's actions. */
  action?: ReactNode;
};

/**
 * The dataset page when there is no map to show: no features, too large to
 * bake, or still baking. It keeps the map page's shape, so nothing moves when
 * the map lands: the title on top of the side panel, the state where the
 * stats will be, the action at the foot, and the bare basemap on the area
 * where the data will be drawn.
 */
export function DatasetNoMapPage({
  areaId,
  categoryHref,
  title,
  lead,
  progress,
  description,
  tone = "neutral",
  action,
}: DatasetNoMapPageProps) {
  const t = useTranslations("DatasetPage");
  return (
    <div className="flex flex-col bg-gray-50 lg:h-[calc(100dvh_-_var(--nav-height))] lg:flex-row lg:overflow-hidden">
      <aside className="flex flex-col border-b border-gray-200 bg-white px-6 py-4 lg:h-full lg:w-96 lg:flex-shrink-0 lg:border-b-0 lg:border-r">
        <div className="shrink-0">
          <Link
            href={categoryHref}
            className="mb-2 flex w-fit items-center gap-1 text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors"
          >
            <ArrowLeft className="size-3.5 flex-shrink-0" aria-hidden />
            {t("back")}
          </Link>
          <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
        </div>
        {/* The state owns the whole tinted well, where the stats will be. */}
        <div className="-mx-6 my-3 flex min-h-0 flex-1 flex-col justify-center border-y border-gray-200 bg-gray-50 px-6 py-8 text-center lg:overflow-y-auto">
          {progress}
          {lead && <p className={`text-lg font-semibold ${LEAD_TONE[tone]}`}>{lead}</p>}
          {description && <p className="mt-1 text-gray-600">{description}</p>}
        </div>
        {/* The map page's action rows. Only saving works before there is a
            map, so the rest hold their place disabled. */}
        <div className="flex shrink-0 flex-col gap-2 pt-2">
          {action}
          <div className="flex gap-2">
            <Button disabled variant="outline" className="h-8 flex-1 text-sm">
              <Download className="h-4 w-4" />
              {t("download")}
            </Button>
            <Button disabled variant="outline" className="h-8 flex-1 text-sm">
              <Share2 className="h-4 w-4" />
              {t("share")}
            </Button>
          </div>
        </div>
      </aside>
      <div className="h-[60vh] lg:h-full lg:flex-1">
        <AreaBasemap areaId={areaId} />
      </div>
    </div>
  );
}
