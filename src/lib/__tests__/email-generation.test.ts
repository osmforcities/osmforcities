import { describe, it, expect, beforeEach, vi } from "vitest";
import { isRTL, getEmailT, clearMessageCache, type Locale } from "../email-i18n";
import { createEmailLink } from "../email-layout";

// Mock the file system
vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

import { promises as fs } from "fs";

const ptMessages = {
  Email: {
    unsubscribe: "Para parar de receber estes e-mails, acesse a {preferencesLink}.",
  },
};

describe("isRTL", () => {
  it("returns true for RTL locales", () => {
    expect(isRTL("ar")).toBe(true);
    expect(isRTL("he")).toBe(true);
    expect(isRTL("fa")).toBe(true);
    expect(isRTL("ur")).toBe(true);
  });

  it("returns false for LTR locales", () => {
    expect(isRTL("en")).toBe(false);
    expect(isRTL("es")).toBe(false);
    expect(isRTL("pt-BR")).toBe(false);
  });
});

describe("getEmailT", () => {
  beforeEach(() => {
    clearMessageCache();
    vi.resetAllMocks();
  });

  it("passes HTML link values through unescaped", async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(ptMessages));
    const url = "http://localhost:3000/preferences";
    const t = await getEmailT("pt-BR" as Locale);
    const result = t("unsubscribe", {
      preferencesLink: createEmailLink(url, "página de preferências"),
    });
    expect(result).toContain(`<a href="${url}"`);
    expect(result).toContain(">página de preferências</a>");
    expect(result).not.toContain("{preferencesLink}");
  });
});
