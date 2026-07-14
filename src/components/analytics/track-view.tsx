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

export const RETRY_INTERVAL_MS = 500;
export const MAX_WAIT_MS = 10_000;

// Exported for unit tests (unit project is node-env, so the React wrapper
// itself is exercised in the browser, not vitest). Returns a cleanup that
// stops polling; calls onFired only when the event was actually sent.
export function startTrackViewEvent(
  event: string,
  url: string | undefined,
  onFired: () => void,
): () => void {
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
    onFired();
    return () => {};
  }

  const deadline = Date.now() + MAX_WAIT_MS;
  const timer = setInterval(() => {
    if (fire()) {
      onFired();
      clearInterval(timer);
      return;
    }
    if (Date.now() > deadline) {
      console.warn(`TrackView: gave up waiting for umami to load ("${event}")`);
      clearInterval(timer);
    }
  }, RETRY_INTERVAL_MS);

  return () => clearInterval(timer);
}

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
    // Guard only against re-sending an event that was actually fired; a
    // timed-out attempt leaves fired false so a prop change can retry.
    if (fired.current) return;
    return startTrackViewEvent(event, url, () => {
      fired.current = true;
    });
  }, [event, url]);

  return null;
}
