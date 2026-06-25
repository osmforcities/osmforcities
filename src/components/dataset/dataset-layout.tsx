type DatasetLayoutProps = {
  infoPanel: React.ReactNode;
  mapPanel: React.ReactNode;
};

const InfoPanel = ({ children }: { children: React.ReactNode }) => {
  return (
    <section
      className="w-[40%] min-w-64 flex flex-col border-r border-neutral-200 dark:border-neutral-800"
      style={{ height: "calc(100vh - var(--nav-height))" }}
    >
      <div className="flex-1 flex flex-col pl-6 pr-3 py-4">{children}</div>
    </section>
  );
};

export function DatasetLayout({ infoPanel, mapPanel }: DatasetLayoutProps) {
  return (
    <div className="flex w-full">
      <InfoPanel>{infoPanel}</InfoPanel>
      <div className="flex-1">{mapPanel}</div>
    </div>
  );
}
