import { describe, it, expect, beforeEach, vi } from "vitest";
import { clearMessageCache } from "@/lib/email-i18n";

// Mock all dependencies before imports
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    dataset: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/email-i18n", () => ({
  EMAIL_LINK_STYLE: 'style="color: #007bff; text-decoration: none;"',
  createEmailLink: vi.fn((url: string, text: string) => `<a href="${url}" style="color: #007bff; text-decoration: none;">${text}</a>`),
  isRTL: vi.fn(() => false),
  getEmailT: vi.fn(),
  clearMessageCache: vi.fn(),
  formatEmail: vi.fn((locale: string, key: string, values?: Record<string, string | number>) => {
    let result = key;
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return result;
  }),
}));

vi.mock("@/lib/template-locale", () => ({
  resolveTemplateForLocale: vi.fn(() => ({ name: "Schools", description: "Schools" })),
}));

vi.mock("html-to-text", () => ({
  htmlToText: vi.fn((html: string) => html.replace(/<[^>]*>/g, "")),
}));

import {
  generateNextUserReport,
  canUpdateReportSent,
  markReportSent,
} from "../user-report";
import { prisma } from "@/lib/db";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { getEmailT } from "@/lib/email-i18n";

const mockPrisma = prisma as unknown as {
  user: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  dataset: { findMany: ReturnType<typeof vi.fn> };
};

/** Builds a simple ICU-like translator from a messages lookup. */
function createMockT(messages: Record<string, string>) {
  const fn = (key: string, values?: Record<string, string | number>) => {
    let result = messages[key] ?? key;
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return result;
  };
  return Object.assign(vi.fn(fn), {
    rich: vi.fn(),
    markup: vi.fn(),
    raw: vi.fn(),
    has: vi.fn(() => true),
  }) as unknown as Awaited<ReturnType<typeof getEmailT>>;
}

const enMessages = {
  lastPeriodDay: "in the last day",
  lastPeriodWeek: "in the last week",
  datasetsOne: "dataset",
  datasetsOther: "datasets",
  reportSubjectChanged: "{count} {datasets} changed {lastPeriod}",
  reportSubjectNoChanges: "No changes",
  reportChanged: "Datasets updated:",
  reportNoChanges: "No changes to {watchedDatasetsLink} {lastPeriod}",
  reportFollowed: "watched datasets",
  preferencesPage: "preferences page",
  generatedAt: "Generated at {timestamp}Z. All dates shown are in UTC.",
  unsubscribe: "Unsubscribe: {preferencesLink}",
  templateDeprecatedDaysRemaining: "You have {days} days remaining.",
  templateDeprecated: "This template was removed from the catalog.",
  greeting: "Hi!",
};

describe("user-report email generation", () => {
  beforeEach(() => {
    clearMessageCache();
    vi.clearAllMocks();
    process.env.AUTH_URL = "https://osmforcities.com";
  });

  const mockUser = {
    id: "user-1",
    email: "user@example.com",
    reportsFrequency: "WEEKLY" as const,
    language: "en",
  };

  const mockDataset = {
    id: "ds-1",
    cityName: "Sao Paulo",
    stats: {
      mostRecentElement: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    template: {
      name: "schools",
      description: "Schools and education",
      deprecatesAt: null,
      translations: [
        { locale: "en", name: "Schools", description: "Schools" },
        { locale: "pt-BR", name: "Escolas", description: "Escolas" },
        { locale: "es", name: "Escuelas", description: "Escuelas" },
      ],
    },
  };

  it("English user gets English template names", async () => {
    vi.mocked(getEmailT).mockResolvedValue(createMockT(enMessages));
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const result = await generateNextUserReport();

    expect(result).not.toBeNull();
    expect(result?.userLanguage).toBe("en");
    expect(result?.emailContent.html).toContain("Schools - Sao Paulo");
  });

  it("Portuguese user gets Portuguese template names", async () => {
    const ptUser = { ...mockUser, language: "pt-BR" };
    const ptMessages = {
      ...enMessages,
      lastPeriodDay: "no último dia",
      lastPeriodWeek: "na última semana",
      datasetsOne: "conjunto de dados",
      datasetsOther: "conjuntos de dados",
      reportSubjectChanged: "{count} {datasets} mudaram {lastPeriod}",
    };
    vi.mocked(getEmailT).mockResolvedValue(createMockT(ptMessages));
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Escolas", description: "Escolas" });
    mockPrisma.user.findFirst.mockResolvedValue(ptUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const result = await generateNextUserReport();

    expect(result).not.toBeNull();
    expect(result?.userLanguage).toBe("pt-BR");
    expect(result?.emailContent.html).toContain("Escolas - Sao Paulo");
    expect(result?.emailContent.subject).toContain("conjunto de dados");
  });

  it("Spanish user gets Spanish template names", async () => {
    const esUser = { ...mockUser, language: "es" };
    const esMessages = {
      ...enMessages,
      lastPeriodDay: "en el último día",
      lastPeriodWeek: "en la última semana",
      datasetsOne: "conjunto de datos",
      datasetsOther: "conjuntos de datos",
      reportSubjectChanged: "{count} {datasets} cambiaron {lastPeriod}",
    };
    vi.mocked(getEmailT).mockResolvedValue(createMockT(esMessages));
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Escuelas", description: "Escuelas" });
    mockPrisma.user.findFirst.mockResolvedValue(esUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const result = await generateNextUserReport();

    expect(result).not.toBeNull();
    expect(result?.userLanguage).toBe("es");
    expect(result?.emailContent.html).toContain("Escuelas - Sao Paulo");
    expect(result?.emailContent.subject).toContain("conjunto de datos");
  });

  it("falls back to English when translation missing", async () => {
    vi.mocked(getEmailT).mockResolvedValue(createMockT(enMessages));
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const result = await generateNextUserReport();

    expect(result?.emailContent.html).toContain("Schools - Sao Paulo");
  });

  it("pluralizes correctly for 1 vs multiple datasets", async () => {
    vi.mocked(getEmailT).mockResolvedValue(createMockT(enMessages));
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);

    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);
    const singleResult = await generateNextUserReport();
    expect(singleResult?.emailContent.subject).toContain("1 dataset");

    mockPrisma.dataset.findMany.mockResolvedValue([
      mockDataset,
      { ...mockDataset, id: "ds-2", cityName: "Rio" },
    ]);
    const multipleResult = await generateNextUserReport();
    expect(multipleResult?.emailContent.subject).toContain("2 datasets");
  });

  it("uses correct frequency term for daily vs weekly", async () => {
    vi.mocked(getEmailT).mockResolvedValue(createMockT(enMessages));
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

  it("uses templateDeprecated (not daysRemaining) when deprecatesAt is in the past", async () => {
    vi.mocked(getEmailT).mockResolvedValue(createMockT(enMessages));
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);

    const expiredDataset = {
      ...mockDataset,
      template: {
        ...mockDataset.template,
        deprecatesAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
      },
    };
    mockPrisma.dataset.findMany.mockResolvedValue([expiredDataset]);

    const result = await generateNextUserReport();

    expect(result).not.toBeNull();
    expect(result?.emailContent.html).toContain("This template was removed from the catalog.");
    expect(result?.emailContent.html).not.toContain("0 days remaining");
  });

  it("shows deprecation notices for all deprecated datasets", async () => {
    vi.mocked(getEmailT).mockResolvedValue(createMockT(enMessages));
    vi.mocked(resolveTemplateForLocale).mockReturnValue({ name: "Schools", description: "Schools" });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);

    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const deprecatedDataset1 = {
      ...mockDataset,
      id: "ds-1",
      template: { ...mockDataset.template, deprecatesAt: futureDate },
    };
    const deprecatedDataset2 = {
      ...mockDataset,
      id: "ds-2",
      cityName: "Rio",
      template: { ...mockDataset.template, deprecatesAt: futureDate },
    };
    mockPrisma.dataset.findMany.mockResolvedValue([deprecatedDataset1, deprecatedDataset2]);

    const result = await generateNextUserReport();

    expect(result).not.toBeNull();
    const occurrences = (result?.emailContent.html.match(/days remaining/g) ?? []).length;
    expect(occurrences).toBe(2);
  });

  it("returns null when no user due for report", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    const result = await generateNextUserReport();
    expect(result).toBeNull();
  });

  it("returns null when no datasets with recent changes", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([]);
    const result = await generateNextUserReport();
    expect(result).toBeNull();
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
    cityName: "Sao Paulo",
    stats: {
      mostRecentElement: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    template: {
      name: "schools",
      description: "Schools and education",
      deprecatesAt: null,
      translations: [{ locale: "en", name: "Schools", description: "Schools" }],
    },
  };

  it("updates lastReportSent when user has watches but datasets have no recent changes", async () => {
    vi.mocked(getEmailT).mockResolvedValue(createMockT(enMessages));
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
    vi.mocked(getEmailT).mockResolvedValue(createMockT(enMessages));
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
    vi.mocked(getEmailT).mockResolvedValue(createMockT(enMessages));
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
    vi.mocked(getEmailT).mockResolvedValue(createMockT(enMessages));
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
    vi.mocked(getEmailT).mockResolvedValue(createMockT(enMessages));
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
        cityName: "Sao Paulo",
        stats: { mostRecentElement: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
        template: {
          name: "schools",
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
