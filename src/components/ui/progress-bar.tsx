"use client";

import { useLayoutEffect, useRef } from "react";
import { ProgressBar as AriaProgressBar } from "react-aria-components";

const SWEEP_ONE_WAY_MS = 1600;

type ProgressBarProps = {
  /**
   * Percent complete, 0-100. Leave it out when the work reports no progress:
   * the bar then sweeps back and forth to show it is running.
   */
  value?: number;
  /** What the bar is measuring, for screen readers. */
  label: string;
};

/**
 * The app's one progress bar, in its two moods: a fill that tracks a
 * percentage, and a sweep that only says "still working". Both share the
 * track and fill so they read as the same control.
 */
export function ProgressBar({ value, label }: ProgressBarProps) {
  const determinate = typeof value === "number";
  const percent = determinate ? Math.min(100, Math.max(0, value)) : 0;
  const sweep = useRef<HTMLDivElement>(null);

  // A re-mounted sweep would restart at the left edge. Starting it on the
  // page's clock puts it where the previous one was.
  useLayoutEffect(() => {
    if (!sweep.current) return;
    const thereAndBackMs = 2 * SWEEP_ONE_WAY_MS;
    sweep.current.style.animationDuration = `${SWEEP_ONE_WAY_MS}ms`;
    sweep.current.style.animationDelay = `-${performance.now() % thereAndBackMs}ms`;
  }, [determinate]);

  return (
    <AriaProgressBar
      aria-label={label}
      value={Math.round(percent)}
      isIndeterminate={!determinate}
      className="h-2 w-full overflow-hidden rounded bg-gray-200"
    >
      {determinate ? (
        <div
          className="h-full rounded bg-olive-500 transition-all duration-500"
          // A sliver stays visible at 0% so the bar reads as started.
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      ) : (
        <div
          ref={sweep}
          className="h-full w-1/3 rounded bg-olive-500 animate-progress-sweep motion-reduce:animate-none"
        />
      )}
    </AriaProgressBar>
  );
}
