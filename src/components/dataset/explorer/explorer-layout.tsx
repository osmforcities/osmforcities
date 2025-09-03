type ExplorerLayoutProps = {
  infoPanel: React.ReactNode;
  mapPanel: React.ReactNode;
};

const InfoPanel = ({ children }: { children: React.ReactNode }) => {
  return (
    <section
      className="w-[32rem] flex flex-col"
      style={{ height: "calc(100vh - var(--nav-height))" }}
    >
      <div className="flex-1 overflow-hidden flex flex-col pl-6 pr-3">
        {children}
      </div>
    </section>
  );
};

export function ExplorerLayout({ infoPanel, mapPanel }: ExplorerLayoutProps) {
  return (
    <div className="flex">
      <InfoPanel>{infoPanel}</InfoPanel>
      <div className="flex-1">{mapPanel}</div>
    </div>
  );
}
