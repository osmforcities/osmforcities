import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock all dependencies before imports
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    dataset: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/email-i18n", () => ({
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

const mockPrisma = prisma as {
  user: { findFirst: ReturnType<typeof vi.fn> };
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
    });
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Schools",
      description: "Schools",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) =>
      t.replace("{watchedDatasetsLink}", `<a href="${v.watchedDatasetsUrl}">${v.watchedDatasetsText}</a>`)
        .replace("{preferencesLink}", `<a href="${v.preferencesUrl}">${v.preferencesText}</a>`)
        .replace("{frequency}", v.frequency || "")
    );
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
    });
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Escolas",
      description: "Escolas",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) =>
      t.replace("{watchedDatasetsLink}", `<a href="${v.watchedDatasetsUrl}">${v.watchedDatasetsText}</a>`)
        .replace("{preferencesLink}", `<a href="${v.preferencesUrl}">${v.preferencesText}</a>`)
        .replace("{frequency}", v.frequency || "")
    );
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
    });
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Escuelas",
      description: "Escuelas",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) =>
      t.replace("{watchedDatasetsLink}", `<a href="${v.watchedDatasetsUrl}">${v.watchedDatasetsText}</a>`)
        .replace("{preferencesLink}", `<a href="${v.preferencesUrl}">${v.preferencesText}</a>`)
        .replace("{frequency}", v.frequency || "")
    );
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
    });
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Schools",
      description: "Schools",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) =>
      t.replace("{watchedDatasetsLink}", `<a href="${v.watchedDatasetsUrl}">${v.watchedDatasetsText}</a>`)
        .replace("{preferencesLink}", `<a href="${v.preferencesUrl}">${v.preferencesText}</a>`)
        .replace("{frequency}", v.frequency || "")
    );
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
    });
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Schools",
      description: "Schools",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) =>
      t.replace("{watchedDatasetsLink}", `<a href="${v.watchedDatasetsUrl}">${v.watchedDatasetsText}</a>`)
        .replace("{preferencesLink}", `<a href="${v.preferencesUrl}">${v.preferencesText}</a>`)
        .replace("{frequency}", v.frequency || "")
    );
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
    });
    vi.mocked(resolveTemplateForLocale).mockReturnValue({
      name: "Schools",
      description: "Schools",
    });
    vi.mocked(interpolateEmail).mockImplementation((t, v) =>
      t.replace("{watchedDatasetsLink}", `<a href="${v.watchedDatasetsUrl}">${v.watchedDatasetsText}</a>`)
        .replace("{preferencesLink}", `<a href="${v.preferencesUrl}">${v.preferencesText}</a>`)
        .replace("{frequency}", v.frequency || "")
    );
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
