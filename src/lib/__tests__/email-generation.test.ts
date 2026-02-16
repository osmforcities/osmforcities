import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getEmailTranslations,
  interpolateEmail,
  formatEmail,
  type Locale,
} from "../email-i18n";

// Mock the file system
vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

import { promises as fs } from "fs";

describe("email-generation integration tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const enTranslations = {
    Email: {
      magicLinkSubject: "Sign in to OSM for Cities",
      magicLinkBody: "Click {magicLink} to sign in.",
      reportSubjectChanged: "{count} {datasets, plural, =1 {dataset} other {datasets}} changed {lastPeriod}",
      reportSubjectNoChanges: "No changes {lastPeriod}",
      reportChanged: "The following datasets were updated {lastPeriod}:",
      reportNoChanges: "There were no changes to your {watchedDatasetsLink} {lastPeriod}.",
      reportFollowed: "watched datasets",
      preferencesPage: "preferences page",
      lastPeriodDay: "in the last day",
      lastPeriodWeek: "in the last week",
      generatedAt: "This report was generated at {timestamp}Z. All dates shown are in UTC.",
      unsubscribe: "To unsubscribe from these reports, visit {preferencesLink}.",
      datasetsOne: "dataset",
      datasetsOther: "datasets",
    },
  };

  const ptTranslations = {
    Email: {
      magicLinkSubject: "Entrar no OSM for Cities",
      magicLinkBody: "Clique {magicLink} para entrar.",
      reportSubjectChanged: "{count} {datasets, plural, =1 {conjunto de dados} other {conjuntos de dados}} mudaram {lastPeriod}",
      reportSubjectNoChanges: "Sem mudanças {lastPeriod}",
      reportChanged: "Os seguintes conjuntos de dados foram atualizados {lastPeriod}:",
      reportNoChanges: "Não houve mudanças nos seus {watchedDatasetsLink} {lastPeriod}.",
      reportFollowed: "conjuntos de dados observados",
      preferencesPage: "página de preferências",
      lastPeriodDay: "no último dia",
      lastPeriodWeek: "na última semana",
      generatedAt: "Este relatório foi gerado em {timestamp}Z. Todas as datas mostradas estão em UTC.",
      unsubscribe: "Para cancelar a inscrição nestes relatórios, visite {preferencesLink}.",
      datasetsOne: "conjunto de dados",
      datasetsOther: "conjuntos de dados",
    },
  };

  const esTranslations = {
    Email: {
      magicLinkSubject: "Iniciar sesión en OSM for Cities",
      magicLinkBody: "Haz clic {magicLink} para iniciar sesión.",
      reportSubjectChanged: "{count} {datasets, plural, =1 {conjunto de datos} other {conjuntos de datos}} cambiaron {lastPeriod}",
      reportSubjectNoChanges: "Sin cambios {lastPeriod}",
      reportChanged: "Los siguientes conjuntos de datos se actualizaron {lastPeriod}:",
      reportNoChanges: "No hubo cambios en tus {watchedDatasetsLink} {lastPeriod}.",
      reportFollowed: "conjuntos de datos monitoreados",
      preferencesPage: "página de preferencias",
      lastPeriodDay: "en el último día",
      lastPeriodWeek: "en la última semana",
      generatedAt: "Este reporte se generó en {timestamp}Z. Todas las fechas mostradas están en UTC.",
      unsubscribe: "Para cancelar la suscripción a estos reportes, visita {preferencesLink}.",
      datasetsOne: "conjunto de datos",
      datasetsOther: "conjuntos de datos",
    },
  };

  describe("getEmailTranslations", () => {
    it("returns English translations", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(enTranslations));

      const t = await getEmailTranslations("en");

      expect(t.magicLinkBody).toBe("Click {magicLink} to sign in.");
      expect(t.lastPeriodDay).toBe("in the last day");
      expect(t.lastPeriodWeek).toBe("in the last week");
    });

    it("returns Portuguese translations with gender-correct last period phrases", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(ptTranslations));

      const t = await getEmailTranslations("pt-BR" as Locale);

      expect(t.magicLinkBody).toBe("Clique {magicLink} para entrar.");
      expect(t.lastPeriodDay).toBe("no último dia");
      expect(t.lastPeriodWeek).toBe("na última semana");
    });

    it("returns Spanish translations with gender-correct last period phrases", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(esTranslations));

      const t = await getEmailTranslations("es" as Locale);

      expect(t.magicLinkBody).toBe("Haz clic {magicLink} para iniciar sesión.");
      expect(t.lastPeriodDay).toBe("en el último día");
      expect(t.lastPeriodWeek).toBe("en la última semana");
    });
  });

  describe("interpolateEmail", () => {
    it("replaces magicLink placeholder with HTML link", () => {
      const result = interpolateEmail("Click {magicLink} to sign in.", {
        magicLink: "http://localhost:3000/api/auth/verify?token=abc",
      });

      expect(result).toContain('<a href="http://localhost:3000/api/auth/verify?token=abc"');
      expect(result).toContain('style="color: #007bff; text-decoration: none;"');
      expect(result).toContain(">link</a>");
      expect(result).not.toContain("{magicLink}");
    });

    it("replaces watchedDatasetsLink and lastPeriod placeholders", () => {
      const result = interpolateEmail(
        "There were no changes to your {watchedDatasetsLink} {lastPeriod}.",
        {
          watchedDatasetsUrl: "http://localhost:3000/",
          watchedDatasetsText: "watched datasets",
          lastPeriod: "in the last week",
        }
      );

      expect(result).toContain('<a href="http://localhost:3000/"');
      expect(result).toContain(">watched datasets</a>");
      expect(result).toContain("in the last week");
      expect(result).not.toContain("{watchedDatasetsLink}");
      expect(result).not.toContain("{lastPeriod}");
    });

    it("replaces preferencesLink placeholder with HTML link", () => {
      const result = interpolateEmail(
        "To unsubscribe from these reports, visit {preferencesLink}.",
        {
          preferencesUrl: "http://localhost:3000/preferences",
          preferencesText: "preferences page",
        }
      );

      expect(result).toContain('<a href="http://localhost:3000/preferences"');
      expect(result).toContain(">preferences page</a>");
      expect(result).not.toContain("{preferencesLink}");
    });

    it("handles count and datasets pluralization", () => {
      const result1 = interpolateEmail("{count} {datasets} changed.", {
        count: 1,
        datasetsOne: "dataset",
        datasetsOther: "datasets",
      });

      expect(result1).toBe("1 dataset changed.");

      const result2 = interpolateEmail("{count} {datasets} changed.", {
        count: 5,
        datasetsOne: "dataset",
        datasetsOther: "datasets",
      });

      expect(result2).toBe("5 datasets changed.");
    });

    it("leaves unknown placeholders untouched", () => {
      const result = interpolateEmail("Hello {name}!", {});

      expect(result).toBe("Hello {name}!");
    });

    it("handles ICU plural format for datasets in subject line with lastPeriod", () => {
      const esSubject = "{count} {datasets, plural, =1 {conjunto de datos} other {conjuntos de datos}} cambiaron {lastPeriod}";
      const result1 = interpolateEmail(esSubject, {
        count: 1,
        datasetsOne: "conjunto de datos",
        datasetsOther: "conjuntos de datos",
        lastPeriod: "en la última semana",
      });

      expect(result1).toBe("1 conjunto de datos cambiaron en la última semana");
      expect(result1).not.toContain("{datasets, plural");

      const result2 = interpolateEmail(esSubject, {
        count: 2,
        datasetsOne: "conjunto de datos",
        datasetsOther: "conjuntos de datos",
        lastPeriod: "en la última semana",
      });

      expect(result2).toBe("2 conjuntos de datos cambiaron en la última semana");
    });

    it("handles Portuguese ICU plural format with gender-correct lastPeriod (day vs week)", () => {
      const ptSubject = "{count} {datasets, plural, =1 {conjunto de dados} other {conjuntos de dados}} mudaram {lastPeriod}";
      const resultDay = interpolateEmail(ptSubject, {
        count: 1,
        datasetsOne: "conjunto de dados",
        datasetsOther: "conjuntos de dados",
        lastPeriod: "no último dia",
      });
      expect(resultDay).toBe("1 conjunto de dados mudaram no último dia");

      const resultWeek = interpolateEmail(ptSubject, {
        count: 5,
        datasetsOne: "conjunto de dados",
        datasetsOther: "conjuntos de dados",
        lastPeriod: "na última semana",
      });
      expect(resultWeek).toBe("5 conjuntos de dados mudaram na última semana");
    });
  });

  describe("formatEmail integration", () => {
    it("formats complete magic link email in English", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(enTranslations));

      const body = await formatEmail("en", "magicLinkBody", {
        magicLink: "http://localhost:3000/api/auth/verify?token=test123",
      });

      expect(body).toContain('<a href="http://localhost:3000/api/auth/verify?token=test123"');
      expect(body).toContain(">link</a>");
    });

    it("formats complete magic link email in Portuguese", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(ptTranslations));

      const body = await formatEmail("pt-BR" as Locale, "magicLinkBody", {
        magicLink: "http://localhost:3000/api/auth/verify?token=test123",
      });

      expect(body).toContain('<a href="http://localhost:3000/api/auth/verify?token=test123"');
      expect(body).toContain(">link</a>");
    });

    it("formats complete magic link email in Spanish", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(esTranslations));

      const body = await formatEmail("es" as Locale, "magicLinkBody", {
        magicLink: "http://localhost:3000/api/auth/verify?token=test123",
      });

      expect(body).toContain('<a href="http://localhost:3000/api/auth/verify?token=test123"');
      expect(body).toContain(">link</a>");
    });
  });

  describe("end-to-end email content generation", () => {
    it("generates complete English user report email with all links", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(enTranslations));

      const t = await getEmailTranslations("en");
      const baseUrl = "http://localhost:3000";

      const noChangesText = interpolateEmail(t.reportNoChanges, {
        watchedDatasetsUrl: `${baseUrl}/`,
        lastPeriod: t.lastPeriodWeek,
      });

      expect(noChangesText).toContain('<a href="http://localhost:3000/"');
      expect(noChangesText).toContain(">watched datasets</a>");
      expect(noChangesText).toContain("in the last week");
      expect(noChangesText).not.toContain("{watchedDatasetsLink}");
    });

    it("generates complete Portuguese user report email with all links", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(ptTranslations));

      const t = await getEmailTranslations("pt-BR" as Locale);
      const baseUrl = "http://localhost:3000";

      const noChangesText = interpolateEmail(t.reportNoChanges, {
        watchedDatasetsUrl: `${baseUrl}/`,
        watchedDatasetsText: t.reportFollowed,
        lastPeriod: t.lastPeriodWeek,
      });

      expect(noChangesText).toContain('<a href="http://localhost:3000/"');
      expect(noChangesText).toContain(">conjuntos de dados observados</a>");
      expect(noChangesText).toContain("na última semana");
      expect(noChangesText).not.toContain("{watchedDatasetsLink}");
    });

    it("generates complete Spanish user report email with all links", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(esTranslations));

      const t = await getEmailTranslations("es" as Locale);
      const baseUrl = "http://localhost:3000";

      // Test unsubscribe link
      const unsubscribeText = interpolateEmail(t.unsubscribe, {
        preferencesUrl: `${baseUrl}/preferences`,
        preferencesText: t.preferencesPage,
      });

      // Verify the link was replaced
      expect(unsubscribeText).toContain('<a href="http://localhost:3000/preferences"');
      expect(unsubscribeText).toContain(">página de preferencias</a>");
      expect(unsubscribeText).not.toContain("{preferencesLink}");
    });
  });
});
