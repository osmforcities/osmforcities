import { Link } from "@/i18n/navigation";

interface ExplorePageLayoutProps {
  children: React.ReactNode;
}

export function ExplorePageLayout({ children }: ExplorePageLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
      <div className="max-w-7xl mx-auto px-6">
        {children}
      </div>
    </div>
  );
}

interface ExploreSectionHeaderProps {
  sectionKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function ExploreSectionHeader({ sectionKey, t }: ExploreSectionHeaderProps) {
  return (
    <div className="mb-8">
      <Link
        href={`/explore`}
        className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer"
      >
        {t("backToExplore")}
      </Link>
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-4">
        {t(`sections.${sectionKey}`)}
      </h1>
    </div>
  );
}
