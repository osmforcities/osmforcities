"use client";

import { useEffect, useRef } from "react";
import type { AnalyticsEvent } from "@/lib/analytics/events";

type UmamiTracker = {
  track: (
    eventOrFn:
      | string
      | ((props: Record<string, unknown>) => Record<string, unknown>),
    data?: Record<string, unknown>,
  ) => void;
};

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

const RETRY_INTERVAL_MS = 500;
const MAX_WAIT_MS = 10_000;

type TrackViewProps = {
  event: AnalyticsEvent;
  /** Virtual URL recorded with the event (defaults to the current page URL). */
  url?: string;
};

/**
 * Fires a view event through the Umami browser script. Client-side on purpose:
 * scrapers fetch HTML without running JS, so view events share page-view
 * semantics instead of counting every bot hit (see dataset_upsell_view skew).
 * The script loads afterInteractive, so poll briefly until window.umami exists.
 */
export function TrackView({ event, url }: TrackViewProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    const fire = () => {
      if (!window.umami) return false;
      if (url) {
        window.umami.track((props) => ({ ...props, name: event, url }));
      } else {
        window.umami.track(event);
      }
      return true;
    };

    if (fire()) {
      fired.current = true;
      return;
    }

    const deadline = Date.now() + MAX_WAIT_MS;
    const timer = setInterval(() => {
      if (fire() || Date.now() > deadline) {
        fired.current = true;
        clearInterval(timer);
      }
    }, RETRY_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [event, url]);

  return null;
}
