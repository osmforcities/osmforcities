import type { ReactNode } from "react";
import { ArrowLeft, Layers } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/ui/page-shell";

/**
 * Why there is no map. The glyph stays the same across every reason (the
 * subject is always this dataset's map) and only the tint changes, so the
 * pages read as one screen in different moods rather than four screens. The
 * tinted disc with a saturated glyph is the grammar the sibling error pages
 * already use.
 */
const TONE = {
  neutral: { disc: "bg-gray-100", glyph: "text-gray-500", text: "text-gray-500" },
  // Work in progress: the bar's olive, so it never reads as the empty state.
  processing: { disc: "bg-olive-100", glyph: "text-olive-600", text: "text-olive-600" },
  warning: { disc: "bg-orange-100", glyph: "text-orange-600", text: "text-orange-600" },
  error: { disc: "bg-red-100", glyph: "text-red-600", text: "text-red-600" },
} as const;

type DatasetNoMapPageProps = {
  areaId: number | string;
  /** Already-translated "Back to {area}", the same link the dataset sidebar shows. */
  backLabel: string;
  /** The subject only, "{dataset} in {area}". It never changes while the page waits. */
  title: string;
  /** The state that opens the body, tinted by tone, with its own full stop:
   *  "Build failed.", "No data yet.". The waiting screens leave it out; their
   *  progress block already says it. */
  lead?: string;
  /** The progress block (stage, bar, step), between the title and the body. */
  progress?: ReactNode;
  /** What happened and what the person can do about it. The waiting screens
   *  leave it out; the progress block says everything. */
  description?: ReactNode;
  tone?: keyof typeof TONE;
  /** The primary action, grouped with the back link at the panel's foot. */
  action?: ReactNode;
};

/**
 * The dataset page when there is no map to show: no features, too large to
 * build, or still baking. The same white card the sibling error pages use,
 * holding icon, subject, state or progress, body, then a foot with the
 * primary action and the way back in the sidebar's own arrow-and-area form.
 * The area is already in the title, so nothing above the icon repeats it.
 */
export function DatasetNoMapPage({
  areaId,
  backLabel,
  title,
  lead,
  progress,
  description,
  tone = "neutral",
  action,
}: DatasetNoMapPageProps) {
  return (
    <PageShell placement="center" className="px-4 py-8">
      {/* The nav is in flow above the shell, so the shell centres in the strip
          below it. A bottom margin of the nav's height moves the card's centre
          up by half that: onto the viewport's centre, where the eye expects it. */}
      <div className="mb-[var(--nav-height)] w-full max-w-md rounded-xl border border-gray-200 bg-white px-6 pb-10 pt-12 text-center shadow-sm sm:px-12">
        <div className="flex flex-col items-center">
          <div
            className={`mb-6 flex size-16 items-center justify-center rounded-full ${TONE[tone].disc}`}
          >
            <Layers className={`size-8 ${TONE[tone].glyph}`} aria-hidden />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-gray-900">{title}</h1>
          {/* Title, progress and foot are each 32px apart: mb-2 plus mt-6
              here, then the foot's mt-8. */}
          {progress && <div className="mt-6 w-full max-w-sm">{progress}</div>}
          {description && (
            <p className="text-gray-600">
              {lead && (
                <span className={`me-1 font-medium ${TONE[tone].text}`}>{lead}</span>
              )}
              {description}
            </p>
          )}
        </div>
        <div className="mt-8 flex flex-col items-center gap-4">
          {action}
          <Link
            href={`/area/${areaId}`}
            className="inline-flex min-w-0 items-center gap-1 text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors"
          >
            <ArrowLeft className="size-3.5 flex-shrink-0" aria-hidden />
            <span className="truncate">{backLabel}</span>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
