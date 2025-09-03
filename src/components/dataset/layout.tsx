"use client";

import { ReactNode } from "react";

type DatasetLayoutProps = {
  sidePanel: ReactNode;
  map: ReactNode;
};

export function DatasetLayout({
  sidePanel,
  map,
}: DatasetLayoutProps) {
  return (
    <div className="flex h-screen">
      {/* Side Panel */}
      <div className="w-96 flex flex-col border-r bg-background">
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4">{sidePanel}</div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 overflow-hidden">{map}</div>
    </div>
  );
}
