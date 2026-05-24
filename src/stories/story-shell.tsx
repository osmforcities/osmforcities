"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";

const NAV_HEIGHT = "4.125rem";

function MockNavBar({ isLoggedIn = true }: { isLoggedIn?: boolean }) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="w-full max-w-7xl mx-auto px-2 md:px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <span className="text-xl font-bold text-gray-900 shrink-0">OSM for Cities</span>

          <div className="flex-1 max-w-md mx-2 md:mx-8">
            <div className="flex items-center gap-2 rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-400">
              <Search size={14} className="shrink-0" />
              <span>Search cities…</span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {isLoggedIn ? (
              <>
                <span className="hidden md:inline text-sm text-gray-600 hover:text-gray-900 cursor-pointer">Dashboard</span>
                <div className="w-8 h-8 rounded-full bg-olive-100 border border-olive-200 flex items-center justify-center text-olive-700 text-sm font-semibold">V</div>
              </>
            ) : (
              <span className="text-sm font-medium text-olive-600 hover:text-olive-700 cursor-pointer">Sign in</span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export function StoryShell({
  children,
  isLoggedIn = true,
}: {
  children: ReactNode;
  isLoggedIn?: boolean;
}) {
  return (
    <div
      style={{ "--nav-height": NAV_HEIGHT } as React.CSSProperties}
      className="min-h-screen flex flex-col bg-white dark:bg-black"
    >
      <MockNavBar isLoggedIn={isLoggedIn} />
      {children}
    </div>
  );
}
