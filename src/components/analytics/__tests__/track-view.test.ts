import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  startTrackViewEvent,
  RETRY_INTERVAL_MS,
  MAX_WAIT_MS,
} from "../track-view";

type TrackArg =
  | string
  | ((props: Record<string, unknown>) => Record<string, unknown>);

function stubWindow(umami?: { track: (arg: TrackArg) => void }) {
  vi.stubGlobal("window", umami ? { umami } : {});
}

describe("startTrackViewEvent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fires immediately when umami is loaded", () => {
    const track = vi.fn();
    stubWindow({ track });
    const onFired = vi.fn();

    startTrackViewEvent("my_event", undefined, onFired);

    expect(track).toHaveBeenCalledWith("my_event");
    expect(onFired).toHaveBeenCalledTimes(1);
  });

  it("uses the function form to set a virtual url", () => {
    const track = vi.fn();
    stubWindow({ track });

    startTrackViewEvent("my_event", "/virtual/url", vi.fn());

    const arg = track.mock.calls[0][0];
    expect(typeof arg).toBe("function");
    const payload = (arg as Exclude<TrackArg, string>)({ hostname: "h" });
    expect(payload).toEqual({
      hostname: "h",
      name: "my_event",
      url: "/virtual/url",
    });
  });

  it("retries until umami appears", () => {
    stubWindow();
    const onFired = vi.fn();

    startTrackViewEvent("my_event", undefined, onFired);
    vi.advanceTimersByTime(RETRY_INTERVAL_MS * 2);
    expect(onFired).not.toHaveBeenCalled();

    const track = vi.fn();
    stubWindow({ track });
    vi.advanceTimersByTime(RETRY_INTERVAL_MS);

    expect(track).toHaveBeenCalledWith("my_event");
    expect(onFired).toHaveBeenCalledTimes(1);
  });

  it("fires only once after umami appears", () => {
    stubWindow();
    const onFired = vi.fn();

    startTrackViewEvent("my_event", undefined, onFired);
    const track = vi.fn();
    stubWindow({ track });
    vi.advanceTimersByTime(RETRY_INTERVAL_MS * 5);

    expect(track).toHaveBeenCalledTimes(1);
    expect(onFired).toHaveBeenCalledTimes(1);
  });

  it("gives up after MAX_WAIT_MS with a warning and without firing", () => {
    stubWindow();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onFired = vi.fn();

    startTrackViewEvent("my_event", undefined, onFired);
    vi.advanceTimersByTime(MAX_WAIT_MS + RETRY_INTERVAL_MS * 2);

    expect(onFired).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleanup stops polling", () => {
    stubWindow();
    const onFired = vi.fn();

    const cleanup = startTrackViewEvent("my_event", undefined, onFired);
    cleanup();

    const track = vi.fn();
    stubWindow({ track });
    vi.advanceTimersByTime(MAX_WAIT_MS);

    expect(track).not.toHaveBeenCalled();
    expect(onFired).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
