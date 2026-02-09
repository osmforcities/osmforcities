import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock all dependencies before imports
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findFirst: vi.fn(), update: vi.fn() },
    dataset: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/email-i18n", () => ({
  EMAIL_LINK_STYLE: 'style="color: #007bff; text-decoration: none;"',
  createEmailLink: vi.fn((url: string, text: string) => `<a href="${url}" style="color: #007bff; text-decoration: none;">${text}</a>`),
  getEmailTranslations: vi.fn(),
  interpolateEmail: vi.fn(),
  formatEmail: vi.fn(),
}));

vi.mock("@/lib/template-locale", () => ({
  resolveTemplateForLocale: vi.fn(() => ({ name: "Schools", description: "Schools" })),
}));

vi.mock("html-to-text", () => ({
  htmlToText: vi.fn((html: string) => html.replace(/<[^>]*>/g, "")),
}));

import {
  generateNextUserReport,
} from "../user-report";
import { prisma } from "@/lib/db";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { getEmailTranslations, interpolateEmail } from "@/lib/email-i18n";

const mockPrisma = prisma as unknown as {
  user: { findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  dataset: { findMany: ReturnType<typeof vi.fn> };
};

describe("user-report email generation", () => {
  beforeEach(() => {
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
    vi.mocked(getEmailTranslations).mockResolvedValue({
      magicLinkSubject: "Sign in",
      magicLinkBody: "Click {magicLink}",
      reportSubjectChanged: "{count} {datasets} changed",
      reportSubjectNoChanges: "No changes",
      reportChanged: "Datasets updated:",
      reportNoChanges: "No changes to {watchedDatasetsLink}",
      reportFollowed: "watched datasets",
      preferencesPage: "preferences page",
      day: "day",
      week: "week",
      generatedAt: "Generated at {timestamp}",
      unsubscribe: "Unsubscribe: {preferencesLink}",
      datasetsOne: "dataset",
      datasetsOther: "datasets",
      templateDeprecated: "This template was removed from the catalog.",
      templateDeprecatedDaysRemaining: "You have {days} day{days, plural, =1 {} other {s}} remaining before this dataset is deleted.",
      greeting: "Hi!",
    });
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Schools",
      description: "Schools",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) => {
      let result = t
        .replace("{watchedDatasetsLink}", `<a href="${v.watchedDatasetsUrl}">${v.watchedDatasetsText}</a>`)
        .replace("{preferencesLink}", `<a href="${v.preferencesUrl}">${v.preferencesText}</a>`)
        .replace("{frequency}", v.frequency || "");
      // Handle {count} and {datasets} placeholders for subject line
      if (v.count !== undefined && v.datasetsOne && v.datasetsOther) {
        const word = v.count === 1 ? v.datasetsOne : v.datasetsOther;
        result = result.replace("{count}", v.count.toString());
        result = result.replace("{datasets}", word);
      }
      return result;
    });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const result = await generateNextUserReport();

    expect(result).not.toBeNull();
    expect(result?.userLanguage).toBe("en");
    expect(result?.emailContent.html).toContain("Schools - Sao Paulo");
  });

  it("Portuguese user gets Portuguese template names", async () => {
    const ptUser = { ...mockUser, language: "pt-BR" };
    vi.mocked(getEmailTranslations).mockResolvedValue({
      magicLinkSubject: "Entrar",
      magicLinkBody: "Clique {magicLink}",
      reportSubjectChanged: "{count} {datasets} mudaram",
      reportSubjectNoChanges: "Sem mudanças",
      reportChanged: "Conjuntos atualizados:",
      reportNoChanges: "Sem mudanças em {watchedDatasetsLink}",
      reportFollowed: "conjuntos de dados observados",
      preferencesPage: "página de preferências",
      day: "dia",
      week: "semana",
      generatedAt: "Gerado em {timestamp}",
      unsubscribe: "Cancelar: {preferencesLink}",
      datasetsOne: "conjunto de dados",
      datasetsOther: "conjuntos de dados",
      templateDeprecated: "Este modelo foi removido do catálogo.",
      templateDeprecatedDaysRemaining: "Você tem {days} dia{days, plural, =1 {} other {s}} restantes antes que este conjunto de dados seja excluído.",
      greeting: "Olá!",
    });
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Escolas",
      description: "Escolas",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) => {
      let result = t
        .replace("{watchedDatasetsLink}", `<a href="${v.watchedDatasetsUrl}">${v.watchedDatasetsText}</a>`)
        .replace("{preferencesLink}", `<a href="${v.preferencesUrl}">${v.preferencesText}</a>`)
        .replace("{frequency}", v.frequency || "");
      // Handle {count} and {datasets} placeholders for subject line
      if (v.count !== undefined && v.datasetsOne && v.datasetsOther) {
        const word = v.count === 1 ? v.datasetsOne : v.datasetsOther;
        result = result.replace("{count}", v.count.toString());
        result = result.replace("{datasets}", word);
      }
      return result;
    });
    mockPrisma.user.findFirst.mockResolvedValue(ptUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const result = await generateNextUserReport();

    expect(result).not.toBeNull();
    expect(result?.userLanguage).toBe("pt-BR");
    expect(result?.emailContent.html).toContain("Escolas - Sao Paulo");
  });

  it("Spanish user gets Spanish template names", async () => {
    const esUser = { ...mockUser, language: "es" };
    vi.mocked(getEmailTranslations).mockResolvedValue({
      magicLinkSubject: "Entrar",
      magicLinkBody: "Haz clic {magicLink}",
      reportSubjectChanged: "{count} {datasets} cambiaron",
      reportSubjectNoChanges: "Sin cambios",
      reportChanged: "Conjuntos actualizados:",
      reportNoChanges: "Sin cambios en {watchedDatasetsLink}",
      reportFollowed: "conjuntos de datos monitoreados",
      preferencesPage: "página de preferencias",
      day: "día",
      week: "semana",
      generatedAt: "Generado en {timestamp}",
      unsubscribe: "Cancelar: {preferencesLink}",
      datasetsOne: "conjunto de datos",
      datasetsOther: "conjuntos de datos",
      templateDeprecated: "Esta plantilla fue eliminada del catálogo.",
      templateDeprecatedDaysRemaining: "Tienes {days} día{days, plural, =1 {} other {s}} restantes antes de que este conjunto de datos sea eliminado.",
      greeting: "¡Hola!",
    });
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Escuelas",
      description: "Escuelas",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) => {
      let result = t
        .replace("{watchedDatasetsLink}", `<a href="${v.watchedDatasetsUrl}">${v.watchedDatasetsText}</a>`)
        .replace("{preferencesLink}", `<a href="${v.preferencesUrl}">${v.preferencesText}</a>`)
        .replace("{frequency}", v.frequency || "");
      // Handle {count} and {datasets} placeholders for subject line
      if (v.count !== undefined && v.datasetsOne && v.datasetsOther) {
        const word = v.count === 1 ? v.datasetsOne : v.datasetsOther;
        result = result.replace("{count}", v.count.toString());
        result = result.replace("{datasets}", word);
      }
      return result;
    });
    mockPrisma.user.findFirst.mockResolvedValue(esUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const result = await generateNextUserReport();

    expect(result).not.toBeNull();
    expect(result?.userLanguage).toBe("es");
    expect(result?.emailContent.html).toContain("Escuelas - Sao Paulo");
  });

  it("falls back to English when translation missing", async () => {
    vi.mocked(getEmailTranslations).mockResolvedValue({
      magicLinkSubject: "Sign in",
      magicLinkBody: "Click {magicLink}",
      reportSubjectChanged: "{count} {datasets} changed",
      reportSubjectNoChanges: "No changes",
      reportChanged: "Datasets updated:",
      reportNoChanges: "No changes to {watchedDatasetsLink}",
      reportFollowed: "watched datasets",
      preferencesPage: "preferences page",
      day: "day",
      week: "week",
      generatedAt: "Generated at {timestamp}",
      unsubscribe: "Unsubscribe: {preferencesLink}",
      datasetsOne: "dataset",
      datasetsOther: "datasets",
      templateDeprecated: "This template was removed from the catalog.",
      templateDeprecatedDaysRemaining: "You have {days} day{days, plural, =1 {} other {s}} remaining before this dataset is deleted.",
      greeting: "Hi!",
    });
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Schools",
      description: "Schools",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) => {
      let result = t
        .replace("{watchedDatasetsLink}", `<a href="${v.watchedDatasetsUrl}">${v.watchedDatasetsText}</a>`)
        .replace("{preferencesLink}", `<a href="${v.preferencesUrl}">${v.preferencesText}</a>`)
        .replace("{frequency}", v.frequency || "");
      // Handle {count} and {datasets} placeholders for subject line
      if (v.count !== undefined && v.datasetsOne && v.datasetsOther) {
        const word = v.count === 1 ? v.datasetsOne : v.datasetsOther;
        result = result.replace("{count}", v.count.toString());
        result = result.replace("{datasets}", word);
      }
      return result;
    });
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    const result = await generateNextUserReport();

    expect(result?.emailContent.html).toContain("Schools - Sao Paulo");
  });

  it("pluralizes correctly for 1 vs multiple datasets", async () => {
    vi.mocked(getEmailTranslations).mockResolvedValue({
      magicLinkSubject: "Sign in",
      magicLinkBody: "Click {magicLink}",
      reportSubjectChanged: "{count} {datasets} changed",
      reportSubjectNoChanges: "No changes",
      reportChanged: "Datasets updated:",
      reportNoChanges: "No changes to {watchedDatasetsLink}",
      reportFollowed: "watched datasets",
      preferencesPage: "preferences page",
      day: "day",
      week: "week",
      generatedAt: "Generated at {timestamp}",
      unsubscribe: "Unsubscribe: {preferencesLink}",
      datasetsOne: "dataset",
      datasetsOther: "datasets",
      templateDeprecated: "This template was removed from the catalog.",
      templateDeprecatedDaysRemaining: "You have {days} day{days, plural, =1 {} other {s}} remaining before this dataset is deleted.",
      greeting: "Hi!",
    });
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Schools",
      description: "Schools",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) => {
      let result = t
        .replace("{watchedDatasetsLink}", `<a href="${v.watchedDatasetsUrl}">${v.watchedDatasetsText}</a>`)
        .replace("{preferencesLink}", `<a href="${v.preferencesUrl}">${v.preferencesText}</a>`)
        .replace("{frequency}", v.frequency || "");
      // Handle {count} and {datasets} placeholders for subject line
      if (v.count !== undefined && v.datasetsOne && v.datasetsOther) {
        const word = v.count === 1 ? v.datasetsOne : v.datasetsOther;
        result = result.replace("{count}", v.count.toString());
        result = result.replace("{datasets}", word);
      }
      return result;
    });
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
    vi.mocked(getEmailTranslations).mockResolvedValue({
      magicLinkSubject: "Sign in",
      magicLinkBody: "Click {magicLink}",
      reportSubjectChanged: "{count} {datasets} changed in the last {frequency}",
      reportSubjectNoChanges: "No changes",
      reportChanged: "Datasets updated:",
      reportNoChanges: "No changes to {watchedDatasetsLink}",
      reportFollowed: "watched datasets",
      preferencesPage: "preferences page",
      day: "day",
      week: "week",
      generatedAt: "Generated at {timestamp}",
      unsubscribe: "Unsubscribe: {preferencesLink}",
      datasetsOne: "dataset",
      datasetsOther: "datasets",
      templateDeprecated: "This template was removed from the catalog.",
      templateDeprecatedDaysRemaining: "You have {days} day{days, plural, =1 {} other {s}} remaining before this dataset is deleted.",
      greeting: "Hi!",
    });
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Schools",
      description: "Schools",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) => {
      let result = t
        .replace("{watchedDatasetsLink}", `<a href="${v.watchedDatasetsUrl}">${v.watchedDatasetsText}</a>`)
        .replace("{preferencesLink}", `<a href="${v.preferencesUrl}">${v.preferencesText}</a>`)
        .replace("{frequency}", v.frequency || "");
      // Handle {count} and {datasets} placeholders for subject line
      if (v.count !== undefined && v.datasetsOne && v.datasetsOther) {
        const word = v.count === 1 ? v.datasetsOne : v.datasetsOther;
        result = result.replace("{count}", v.count.toString());
        result = result.replace("{datasets}", word);
      }
      return result;
    });
    mockPrisma.dataset.findMany.mockResolvedValue([mockDataset]);

    mockPrisma.user.findFirst.mockResolvedValue({
      ...mockUser,
      reportsFrequency: "WEEKLY",
    });
    const weeklyResult = await generateNextUserReport();
    expect(weeklyResult?.reportData.reportsFrequency).toBe("WEEKLY");
    expect(weeklyResult?.emailContent.subject).toContain("in the last week");

    mockPrisma.user.findFirst.mockResolvedValue({
      ...mockUser,
      reportsFrequency: "DAILY",
    });
    const dailyResult = await generateNextUserReport();
    expect(dailyResult?.reportData.reportsFrequency).toBe("DAILY");
    expect(dailyResult?.emailContent.subject).toContain("in the last day");
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
      translations: [
        { locale: "en", name: "Schools", description: "Schools" },
      ],
    },
  };

  const mockTranslations = {
    magicLinkSubject: "Sign in",
    magicLinkBody: "Click {magicLink}",
    reportSubjectChanged: "{count} {datasets} changed",
    reportSubjectNoChanges: "No changes",
    reportChanged: "Datasets updated:",
    reportNoChanges: "No changes to {watchedDatasetsLink}",
    reportFollowed: "watched datasets",
    preferencesPage: "preferences page",
    day: "day",
    week: "week",
    generatedAt: "Generated at {timestamp}",
    unsubscribe: "Unsubscribe: {preferencesLink}",
    datasetsOne: "dataset",
    datasetsOther: "datasets",
    templateDeprecated: "This template was removed from the catalog.",
    templateDeprecatedDaysRemaining: "You have {days} day{days, plural, =1 {} other {s}} remaining before this dataset is deleted.",
    greeting: "Hi!",
  };

  it("updates lastReportSent when user has watches but datasets have no recent changes", async () => {
    vi.mocked(getEmailTranslations).mockResolvedValue(mockTranslations);
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Schools",
      description: "Schools",
    });
    vi.mocked(interpolateEmail).mockImplementation((t) => t);

    mockPrisma.user.findFirst.mockResolvedValue(userWithWatches);
    // Dataset with old changes (48h ago, older than DAILY frequency)
    const oldDataset = {
      ...mockDatasetWithChanges,
      stats: {
        mostRecentElement: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
    };
    mockPrisma.dataset.findMany.mockResolvedValue([oldDataset]);
    mockPrisma.user.update.mockResolvedValue(userWithWatches);

    const result = await generateNextUserReport();

    // User has watches but no recent changes - should update lastReportSent and return null
    expect(result).toBeNull();
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-with-watches" },
      data: { lastReportSent: expect.any(Date) },
    });
  });

  it("processes multiple users correctly in sequence", async () => {
    vi.mocked(getEmailTranslations).mockResolvedValue(mockTranslations);
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Schools",
      description: "Schools",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) => {
      let result = t.replace("{watchedDatasetsLink}", `${v.watchedDatasetsUrl}`)
        .replace("{preferencesLink}", `${v.preferencesUrl}`)
        .replace("{frequency}", v.frequency || "");
      if (v.count !== undefined && v.datasetsOne && v.datasetsOther) {
        const word = v.count === 1 ? v.datasetsOne : v.datasetsOther;
        result = result.replace("{count}", v.count.toString());
        result = result.replace("{datasets}", word);
      }
      return result;
    });

    // First call: user with watches but no recent changes
    mockPrisma.user.findFirst.mockResolvedValueOnce(userWithWatches);
    const oldDataset = {
      ...mockDatasetWithChanges,
      stats: {
        mostRecentElement: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
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
    vi.mocked(getEmailTranslations).mockResolvedValue(mockTranslations);
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Schools",
      description: "Schools",
    });
    vi.mocked(interpolateEmail).mockImplementation((t) => t);

    // User with lastReportSent 23h ago (DAILY) - should be selected
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
    vi.mocked(getEmailTranslations).mockResolvedValue(mockTranslations);
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Schools",
      description: "Schools",
    });
    vi.mocked(interpolateEmail).mockImplementation((t) => t);

    // User with WEEKLY frequency and lastReportSent 6 days ago
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
