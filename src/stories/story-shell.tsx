"use client";

import { Search, Info, Home, ArrowLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";

const NAV_HEIGHT = "4.125rem";

export interface MockNavBarProps {
  isLoggedIn?: boolean;
  pageTitle?: string;
  pageTitleMuted?: boolean;
  backLabel?: string;
}

export function MockNavBar({
  isLoggedIn = true,
  pageTitle,
  pageTitleMuted = false,
  backLabel,
}: MockNavBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  if (searchOpen) {
    return (
      <nav className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="flex h-16 items-center gap-3">
            <Search size={16} className="text-neutral-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search cities…"
              className="flex-1 text-sm text-neutral-800 placeholder:text-neutral-400 outline-none bg-transparent"
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="text-sm text-neutral-500 hover:text-neutral-800 shrink-0 px-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white shadow-sm">
      <div className="w-full max-w-7xl mx-auto px-4">
        <div
          className="h-16"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
          }}
        >
          {/* Left zone */}
          <div className="flex items-center min-w-0">
            {backLabel ? (
              <>
                <span className="hidden md:flex items-center gap-0">
                  <span className="text-sm font-bold text-neutral-900 whitespace-nowrap">
                    OSM for Cities
                  </span>
                  <span className="mx-3 h-4 w-px bg-neutral-200 shrink-0" />
                  <button className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 whitespace-nowrap">
                    <ArrowLeft size={13} />
                    {backLabel}
                  </button>
                </span>
                <button className="md:hidden flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
                  <ArrowLeft size={14} />
                  <span className="truncate max-w-[90px]">{backLabel}</span>
                </button>
              </>
            ) : pageTitle ? (
              <>
                <span className="hidden md:block text-sm font-bold text-neutral-900 whitespace-nowrap">
                  OSM for Cities
                </span>
                <button
                  className="md:hidden p-1 text-neutral-400 hover:text-neutral-700 rounded"
                  aria-label="Home"
                >
                  <Home size={20} />
                </button>
              </>
            ) : (
              <span className="text-sm font-bold text-neutral-900 whitespace-nowrap">
                OSM for Cities
              </span>
            )}
          </div>

          {/* Center zone */}
          <div className="flex items-center justify-center px-3">
            {pageTitle && (
              <span
                className={`text-sm whitespace-nowrap ${
                  pageTitleMuted
                    ? "font-medium text-neutral-500"
                    : "font-semibold text-neutral-900"
                }`}
              >
                {pageTitle}
              </span>
            )}
          </div>

          {/* Right zone */}
          <div className="flex items-center justify-end gap-0.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-md"
              aria-label="Search"
            >
              <Search size={17} />
            </button>
            <button
              className="hidden md:flex p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-md"
              aria-label="About"
            >
              <Info size={17} />
            </button>
            {isLoggedIn ? (
              <div className="relative ml-1">
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="w-8 h-8 rounded-full bg-red-700 flex items-center justify-center text-white text-xs font-bold"
                  aria-label="User menu"
                >
                  VG
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-10 w-44 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50">
                    <button className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                      Dashboard
                    </button>
                    <div className="my-1 border-t border-neutral-100" />
                    <button className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                      Preferences
                    </button>
                    <div className="my-1 border-t border-neutral-100" />
                    <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-neutral-50">
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="ml-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded-md hover:bg-neutral-700">
                Sign in
              </button>
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
  pageTitle,
  pageTitleMuted = false,
  backLabel,
}: {
  children: ReactNode;
  isLoggedIn?: boolean;
  pageTitle?: string;
  pageTitleMuted?: boolean;
  backLabel?: string;
}) {
  return (
    <div
      style={{ "--nav-height": NAV_HEIGHT } as React.CSSProperties}
      className="min-h-screen flex flex-col bg-white dark:bg-black"
    >
      <MockNavBar
        isLoggedIn={isLoggedIn}
        pageTitle={pageTitle}
        pageTitleMuted={pageTitleMuted}
        backLabel={backLabel}
      />
      {children}
    </div>
  );
}
