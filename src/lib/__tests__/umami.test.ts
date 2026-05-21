import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getClientInfo, trackEvent, type ClientInfo } from "../umami";
import { NextRequest } from "next/server";

function makeRequest(hdrs: Record<string, string>): NextRequest {
  return new NextRequest("https://example.com/test", { headers: hdrs });
}

describe("getClientInfo", () => {
  it("extracts ip from x-forwarded-for (first entry)", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientInfo(req).ip).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = makeRequest({ "x-real-ip": "9.9.9.9" });
    expect(getClientInfo(req).ip).toBe("9.9.9.9");
  });

  it("extracts userAgent", () => {
    const req = makeRequest({ "user-agent": "TestBrowser/1.0" });
    expect(getClientInfo(req).userAgent).toBe("TestBrowser/1.0");
  });

  it("extracts first language tag from accept-language", () => {
    const req = makeRequest({ "accept-language": "pt-BR,pt;q=0.9,en;q=0.8" });
    expect(getClientInfo(req).language).toBe("pt-BR");
  });

  it("returns undefined for absent headers", () => {
    const req = makeRequest({});
    const info = getClientInfo(req);
    expect(info.ip).toBeUndefined();
    expect(info.userAgent).toBeUndefined();
    expect(info.language).toBeUndefined();
    expect(info.referrer).toBeUndefined();
  });
});

describe("trackEvent", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = "test-website-id";
    process.env.NEXT_PUBLIC_UMAMI_URL = "https://analytics.example.com";
    vi.spyOn(global, "fetch").mockResolvedValue(new Response());
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("does nothing when env vars are absent", () => {
    delete process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    trackEvent("test_event", "/test");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends POST to /api/send with event payload", async () => {
    trackEvent("dataset_create", "/datasets/123/create");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());

    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://analytics.example.com/api/send");
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.payload.name).toBe("dataset_create");
    expect(body.payload.website).toBe("test-website-id");
  });

  it("forwards ip and userAgent as headers when clientInfo provided", async () => {
    const clientInfo: ClientInfo = { ip: "1.2.3.4", userAgent: "TestAgent/1" };
    trackEvent("sign_up", "/sign-up", clientInfo);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());

    const [, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((opts as RequestInit).headers).toMatchObject({
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "TestAgent/1",
    });
  });
});
