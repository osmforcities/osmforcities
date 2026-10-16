import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AVAILABLE_LOCALES } from "@/i18n/constants";
import { clearMessageCache } from "@/lib/email-i18n";

// Mock all dependencies before imports
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    dataset: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/template-locale", () => ({
  resolveTemplateForLocale: vi.fn(() => ({ name: "Schools", description: "Schools" })),
}));

import {
  generateNextUserReport,
  canUpdateReportSent,
  markReportSent,
} from "../user-report";
import { prisma } from "@/lib/db";
import { resolveTemplateForLocale } from "@/lib/template-locale";

const mockPrisma = prisma as unknown as {
  user: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  dataset: { findMany: ReturnType<typeof vi.fn> };
};

describe("user-report email generation", () => {
  beforeEach(() => {
    clearMessageCache();
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
    process.env.AUTH_URL = "https://osmforcities.com";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockUser = {
    id: "user-1",
    email: "user@example.com",
    reportsFrequency: "WEEKLY" as const,
    language: "en",
  };

  const mockDataset = {
    id: "ds-1",
    areaId: 12345,
    templateId: "template-schools",
    cityName: "Sao Paulo",
    dataCount: 1284,
    area: { name: "Sao Paulo", names: {} },
    stats: {
      mostRecentElement: "2026-10-16T00:00:00Z",
      editorsCount: 7,
    },
    template: {
      name: "schools",
      category: { slug: "education" },
      description: "Schools and education",
      deprecatesAt: null as Date | null,
      translations: [
        { locale: "en", name: "Schools", description: "Schools" },
        { locale: "pt-BR", name: "Escolas", description: "Escolas" },
        { locale: "es", name: "Escuelas", description: "Escuelas" },
      ],
    },
  };

  const datasetUrl = (locale: string) =>
    `https://osmforcities.com/${locale}/area/${mockDataset.areaId}/dataset/${mockDataset.templateId}`;

  it("English user gets English template names", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const result = await generateNextUserReport();

    expect(result).not.toBeNull();
    expect(result?.userLanguage).toBe("en");
    expect(result?.emailContent.subject).toBe("1 dataset changed in the last week");
    expect(result?.emailContent.text).toContain(`Schools [${datasetUrl("en")}]`);
    expect(result?.emailContent.text).toContain("Sao Paulo");
    expect(result?.emailContent.text).toContain(
      "Last edit Oct 16\n1,284 features\n7 mappers"
    );
  });

  it("ends with a button to the dashboard", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const result = await generateNextUserReport();

    expect(result?.emailContent.text).toContain(
      "Go to your dashboard [https://osmforcities.com/en/dashboard]"
    );
  });

  it("shows the template icon tile in HTML only", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const { html, text } = (await generateNextUserReport())!.emailContent;

    expect(html).toContain(
      'src="https://osmforcities.com/api/email-icon?template=template-schools&amp;category=education"'
    );
    expect(text).not.toContain("email-icon");
  });

  it("lists the most recent change first and caps the list", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    const datasets = Array.from({ length: 12 }, (_, i) => ({
      ...mockDataset,
      id: `ds-${i}`,
      templateId: `t-${i}`,
      stats: { mostRecentElement: `2026-10-16T${String(i).padStart(2, "0")}:00:00Z` },
    }));
    vi.mocked(resolveTemplateForLocale).mockImplementation(() => ({ name: "T", description: "" }));
    mockPrisma.dataset.findMany.mockResolvedValue(datasets);

    const result = await generateNextUserReport();
    const { text } = result!.emailContent;

    const shown = [...text.matchAll(/dataset\/(t-\d+)/g)].map((m) => m[1]);
    expect(shown).toEqual(["t-11", "t-10", "t-9", "t-8", "t-7", "t-6", "t-5", "t-4", "t-3", "t-2"]);
    expect(text).toContain("2 more datasets changed.");
  });

  it("keeps a dataset with a pending deletion in the capped list", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    const datasets = Array.from({ length: 12 }, (_, i) => ({
      ...mockDataset,
      id: `ds-${i}`,
      templateId: `t-${i}`,
      stats: { mostRecentElement: `2026-10-16T${String(i).padStart(2, "0")}:00:00Z` },
      template: {
        ...mockDataset.template,
        deprecatesAt: i === 0 ? new Date("2026-10-20T12:00:00Z") : null,
      },
    }));
    mockPrisma.dataset.findMany.mockResolvedValue(datasets);

    const { html, text } = (await generateNextUserReport())!.emailContent;

    expect(text.indexOf("Removed from the catalog")).toBeLessThan(text.indexOf("dataset/t-11"));
    expect(html).toContain("This dataset will be deleted after October 20, 2026.");
  });

  it("uses app olive links, never the old blue", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const { html } = (await generateNextUserReport())!.emailContent;

    expect(html).not.toMatch(/#007bff|#0b4ad8/i);
  });

  it("Portuguese user gets Portuguese template names and dates", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Escolas", description: "Escolas" });
    mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, language: "pt-BR" });
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const result = await generateNextUserReport();

    expect(result?.userLanguage).toBe("pt-BR");
    expect(result?.emailContent.subject).toBe("1 conjunto de dados mudou na última semana");
    expect(result?.emailContent.text).toContain(`Escolas [${datasetUrl("pt-BR")}]`);
    expect(result?.emailContent.text).toContain("Última edição em 16 de out.");
    expect(result?.emailContent.text).toContain("1.284 feições\n7 mapeadores");
  });

  it("uses the localized area name", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, language: "pt-BR" });
    mockPrisma.dataset.findMany.mockResolvedValue([
      { ...mockDataset, area: { name: "Amsterdam", names: { pt: "Amesterdão" } } },
    ]);

    const result = await generateNextUserReport();

    expect(result?.emailContent.html).toContain("Amesterdão");
  });

  it.each(AVAILABLE_LOCALES)("renders %s with card, footer and each URL once in text", async (locale) => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, language: locale });
    mockPrisma.dataset.findMany.mockResolvedValue([
      mockDataset,
      {
        ...mockDataset,
        id: "ds-retired",
        templateId: "retired",
        template: { ...mockDataset.template, deprecatesAt: new Date("2026-10-21T12:00:00Z") },
      },
    ]);

    const result = await generateNextUserReport();
    const { html, text } = result!.emailContent;

    expect(html).toContain(`lang="${locale}"`);
    expect(html).toMatch(/<h1[^>]*>[^<]*\S[^<]*<\/h1>/);
    expect(html).toContain("2026");
    expect(html).not.toMatch(/\{\w+\}/);
    expect(text.split(datasetUrl(locale))).toHaveLength(2);
    expect(text.split(`https://osmforcities.com/${locale}/preferences`)).toHaveLength(2);
    expect(text).not.toContain("dataset/retired");
  });

  it("drops the link and Open button from a retired dataset", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "" });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([
      {
        ...mockDataset,
        template: { ...mockDataset.template, deprecatesAt: new Date("2026-10-21T12:00:00Z") },
      },
    ]);

    const { html } = (await generateNextUserReport())!.emailContent;

    expect(html).not.toContain(datasetUrl("en"));
    expect(html).not.toMatch(/>Open<\/a>/);
    expect(html).toContain(
      "Schools is no longer in the catalog and its page is unavailable. This dataset will be deleted after October 21, 2026."
    );
  });

  it("never splits a stat across lines", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const { html } = (await generateNextUserReport())!.emailContent;

    const stats = [...html.matchAll(/<div style="white-space: nowrap;">(.*?)<\/div>/g)];
    expect(stats.map((m) => m[1].replace(/<[^>]+>/g, "").trim())).toEqual([
      "Last edit Oct 16",
      "1,284 features",
      "7 mappers",
    ]);
  });

  it("escapes OSM-sourced names in the HTML body", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "A & B", description: "" });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([
      { ...mockDataset, area: { name: "<b>Town</b>", names: {} } },
    ]);

    const result = await generateNextUserReport();

    expect(result?.emailContent.html).toContain("<strong>A &amp; B</strong>");
    expect(result?.emailContent.html).toContain("&lt;b&gt;Town&lt;/b&gt;");
  });

  it("pluralizes correctly for 1 vs multiple datasets", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);

    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);
    const singleResult = await generateNextUserReport();
    expect(singleResult?.emailContent.subject).toContain("1 dataset changed");

    mockPrisma.dataset.findMany.mockResolvedValue([
      mockDataset,
      { ...mockDataset, id: "ds-2", cityName: "Rio" },
    ]);
    const multipleResult = await generateNextUserReport();
    expect(multipleResult?.emailContent.subject).toContain("2 datasets changed");
  });

  it("uses correct frequency term for daily vs weekly", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, reportsFrequency: "WEEKLY" });
    const weeklyResult = await generateNextUserReport();
    expect(weeklyResult?.reportData.reportsFrequency).toBe("WEEKLY");
    expect(weeklyResult?.emailContent.subject).toContain("in the last week");

    mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, reportsFrequency: "DAILY" });
    const dailyResult = await generateNextUserReport();
    expect(dailyResult?.reportData.reportsFrequency).toBe("DAILY");
    expect(dailyResult?.emailContent.subject).toContain("in the last day");
  });

  it("says deletion is soon when the retirement date has passed", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);

    const expiredDataset = {
      ...mockDataset,
      template: { ...mockDataset.template, deprecatesAt: new Date("2026-10-15T12:00:00Z") },
    };
    mockPrisma.dataset.findMany.mockResolvedValue([expiredDataset]);

    const result = await generateNextUserReport();

    expect(result?.emailContent.html).toContain("This dataset will be deleted soon.");
    expect(result?.emailContent.html).not.toContain("deleted after");
  });

  it("puts each retirement warning right after its own dataset", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    vi.mocked(resolveTemplateForLocale)
      .mockReturnValueOnce({ name: "Schools", description: "" })
      .mockReturnValueOnce({ name: "Parks", description: "" });
    mockPrisma.dataset.findMany.mockResolvedValue([
      {
        ...mockDataset,
        template: { ...mockDataset.template, deprecatesAt: new Date("2026-10-17T12:00:00Z") },
      },
      { ...mockDataset, id: "ds-2", templateId: "parks" },
    ]);

    const result = await generateNextUserReport();
    const { text } = result!.emailContent;

    const schools = text.indexOf("Schools");
    const notice = text.indexOf("Removed from the catalog");
    const parks = text.indexOf("Parks [");
    expect(schools).toBeGreaterThan(-1);
    expect(notice).toBeGreaterThan(schools);
    expect(parks).toBeGreaterThan(notice);
    expect(text.match(/Removed from the catalog/g)).toHaveLength(1);
  });

  it("returns null when no user due for report", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    const result = await generateNextUserReport();
    expect(result).toBeNull();
  });

  it("skips a dataset whose last change date is unparseable", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([
      { ...mockDataset, stats: { mostRecentElement: "not a date" } },
    ]);

    await expect(generateNextUserReport()).resolves.toBeNull();
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
  });

  it("returns null when no datasets with recent changes", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([]);
    const result = await generateNextUserReport();
    expect(result).toBeNull();
  });

  it("links to the area/template dataset route, not the bare dataset id", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const result = await generateNextUserReport();

    expect(result?.emailContent.html).toContain(datasetUrl("en"));
    expect(result?.emailContent.html).not.toContain(`/dataset/${mockDataset.id}`);
  });
});

describe("deadlock scenario", () => {
  beforeEach(() => {
    clearMessageCache();
    vi.clearAllMocks();
    process.env.AUTH_URL = "https://osmforcities.com";
  });

  const userWithWatches = {
    id: "user-with-watches",
    email: "user@example.com",
    reportsFrequency: "DAILY" as const,
    language: "en",
    lastReportSent: null,
  };

  const mockDatasetWithChanges = {
    id: "ds-1",
    areaId: 12345,
    templateId: "template-schools",
    cityName: "Sao Paulo",
    area: { name: "Sao Paulo", names: {} },
    stats: {
      mostRecentElement: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    template: {
      name: "schools",
      category: { slug: "education" },
      description: "Schools and education",
      deprecatesAt: null,
      translations: [{ locale: "en", name: "Schools", description: "Schools" }],
    },
  };

  it("updates lastReportSent when user has watches but datasets have no recent changes", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });

    mockPrisma.user.findFirst.mockResolvedValue(userWithWatches);
    const oldDataset = {
      ...mockDatasetWithChanges,
      stats: { mostRecentElement: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
    };
    mockPrisma.dataset.findMany.mockResolvedValue([oldDataset]);
    mockPrisma.user.update.mockResolvedValue(userWithWatches);

    const result = await generateNextUserReport();

    expect(result).toBeNull();
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-with-watches" },
      data: { lastReportSent: expect.any(Date) },
    });
  });

  it("processes multiple users correctly in sequence", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });

    // First call: user with watches but no recent changes
    mockPrisma.user.findFirst.mockResolvedValueOnce(userWithWatches);
    const oldDataset = {
      ...mockDatasetWithChanges,
      stats: { mostRecentElement: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
    };
    mockPrisma.dataset.findMany.mockResolvedValueOnce([oldDataset]);
    mockPrisma.user.update.mockResolvedValue(userWithWatches);

    const result1 = await generateNextUserReport();
    expect(result1).toBeNull();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-with-watches" },
      data: { lastReportSent: expect.any(Date) },
    });

    // Second call: valid user with recent changes
    const validUser = { ...userWithWatches, id: "valid-user" };
    mockPrisma.user.findFirst.mockResolvedValueOnce(validUser);
    mockPrisma.dataset.findMany.mockResolvedValueOnce([mockDatasetWithChanges]);
    mockPrisma.user.update.mockResolvedValue(validUser);

    const result2 = await generateNextUserReport();
    expect(result2).not.toBeNull();
    expect(result2?.userId).toBe("valid-user");
  });

  it("correctly filters by DAILY frequency timing", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });

    const user23hAgo = {
      ...userWithWatches,
      lastReportSent: new Date(Date.now() - 23 * 60 * 60 * 1000),
    };
    mockPrisma.user.findFirst.mockResolvedValue(user23hAgo);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDatasetWithChanges]);
    mockPrisma.user.update.mockResolvedValue(user23hAgo);

    const result = await generateNextUserReport();
    expect(result).not.toBeNull();
  });

  it("correctly filters by WEEKLY frequency timing", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });

    const weeklyUser = {
      ...userWithWatches,
      reportsFrequency: "WEEKLY" as const,
      lastReportSent: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    };
    mockPrisma.user.findFirst.mockResolvedValue(weeklyUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDatasetWithChanges]);
    mockPrisma.user.update.mockResolvedValue(weeklyUser);

    const result = await generateNextUserReport();
    expect(result).not.toBeNull();
    expect(result?.reportData.reportsFrequency).toBe("WEEKLY");
  });
});

describe("report status tracking helpers", () => {
  beforeEach(() => {
    clearMessageCache();
    vi.clearAllMocks();
  });

  describe("canUpdateReportSent", () => {
    it("returns true when user exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
      const result = await canUpdateReportSent("user-1");
      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { id: true },
      });
    });

    it("returns false when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await canUpdateReportSent("nonexistent-user");
      expect(result).toBe(false);
    });
  });

  describe("markReportSent", () => {
    it("updates lastReportSent timestamp", async () => {
      const beforeDate = new Date();
      mockPrisma.user.update.mockResolvedValue({ id: "user-1" });

      await markReportSent("user-1");

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { lastReportSent: expect.any(Date) },
      });
      const updateCall = mockPrisma.user.update.mock.calls[0];
      const timestamp = updateCall[0].data.lastReportSent as Date;
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
    });
  });

  it("does not update lastReportSent when generating report with recent changes", async () => {
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });

    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      reportsFrequency: "DAILY" as const,
      language: "en",
    });
    mockPrisma.dataset.findMany.mockResolvedValue([
      {
        id: "ds-1",
        areaId: 12345,
        templateId: "template-schools",
        cityName: "Sao Paulo",
        area: { name: "Sao Paulo", names: {} },
        stats: { mostRecentElement: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
        template: {
          name: "schools",
          category: { slug: "education" },
          description: "Schools and education",
          deprecatesAt: null,
          translations: [{ locale: "en", name: "Schools", description: "Schools" }],
        },
      },
    ]);

    const result = await generateNextUserReport();

    expect(result).not.toBeNull();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});
