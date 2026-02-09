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
      reportSubjectChanged: "{count} {datasets, plural, =1 {dataset} other {datasets}} changed in the last {frequency}",
      reportSubjectNoChanges: "No changes in the last {frequency}",
      reportChanged: "The following datasets were updated in the last {frequency}:",
      reportNoChanges: "There were no changes to your {watchedDatasetsLink} in the last {frequency}.",
      reportFollowed: "watched datasets",
      preferencesPage: "preferences page",
      day: "day",
      week: "week",
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
      reportSubjectChanged: "{count} {datasets, plural, =1 {conjunto de dados} other {conjuntos de dados}} mudaram na última {frequency}",
      reportSubjectNoChanges: "Sem mudanças na última {frequency}",
      reportChanged: "Os seguintes conjuntos de dados foram atualizados na última {frequency}:",
      reportNoChanges: "Não houve mudanças nos seus {watchedDatasetsLink} na última {frequency}.",
      reportFollowed: "conjuntos de dados observados",
      preferencesPage: "página de preferências",
      day: "dia",
      week: "semana",
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
      reportSubjectChanged: "{count} {datasets, plural, =1 {conjunto de datos} other {conjuntos de datos}} cambiaron en la última {frequency}",
      reportSubjectNoChanges: "Sin cambios en la última {frequency}",
      reportChanged: "Los siguientes conjuntos de datos se actualizaron en la última {frequency}:",
      reportNoChanges: "No hubo cambios en tus {watchedDatasetsLink} en la última {frequency}.",
      reportFollowed: "conjuntos de datos monitoreados",
      preferencesPage: "página de preferencias",
      day: "día",
      week: "semana",
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
      expect(t.day).toBe("day");
      expect(t.week).toBe("week");
    });

    it("returns Portuguese translations", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(ptTranslations));

      const t = await getEmailTranslations("pt-BR" as Locale);

      expect(t.magicLinkBody).toBe("Clique {magicLink} para entrar.");
      expect(t.day).toBe("dia");
      expect(t.week).toBe("semana");
    });

    it("returns Spanish translations", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(esTranslations));

      const t = await getEmailTranslations("es" as Locale);

      expect(t.magicLinkBody).toBe("Haz clic {magicLink} para iniciar sesión.");
      expect(t.day).toBe("día");
      expect(t.week).toBe("semana");
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

    it("replaces watchedDatasetsLink placeholder with HTML link", () => {
      const result = interpolateEmail(
        "There were no changes to your {watchedDatasetsLink} in the last {frequency}.",
        {
          watchedDatasetsUrl: "http://localhost:3000/",
          watchedDatasetsText: "watched datasets",
          frequency: "week",
        }
      );

      expect(result).toContain('<a href="http://localhost:3000/"');
      expect(result).toContain(">watched datasets</a>");
      expect(result).toContain("in the last week");
      expect(result).not.toContain("{watchedDatasetsLink}");
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

    it("handles ICU plural format for datasets in subject line", () => {
      // Spanish subject line with ICU plural format
      const esSubject = "{count} {datasets, plural, =1 {conjunto de datos} other {conjuntos de datos}} cambiaron en la última {frequency}";
      const result1 = interpolateEmail(esSubject, {
        count: 1,
        datasetsOne: "conjunto de datos",
        datasetsOther: "conjuntos de datos",
        frequency: "semana",
      });

      expect(result1).toBe("1 conjunto de datos cambiaron en la última semana");
      expect(result1).not.toContain("{datasets, plural");

      const result2 = interpolateEmail(esSubject, {
        count: 2,
        datasetsOne: "conjunto de datos",
        datasetsOther: "conjuntos de datos",
        frequency: "semana",
      });

      expect(result2).toBe("2 conjuntos de datos cambiaron en la última semana");
    });

    it("handles Portuguese ICU plural format for datasets in subject line", () => {
      const ptSubject = "{count} {datasets, plural, =1 {conjunto de dados} other {conjuntos de dados}} mudaram na última {frequency}";
      const result1 = interpolateEmail(ptSubject, {
        count: 1,
        datasetsOne: "conjunto de dados",
        datasetsOther: "conjuntos de dados",
        frequency: "semana",
      });

      expect(result1).toBe("1 conjunto de dados mudaram na última semana");

      const result2 = interpolateEmail(ptSubject, {
        count: 5,
        datasetsOne: "conjunto de dados",
        datasetsOther: "conjuntos de dados",
        frequency: "semana",
      });

      expect(result2).toBe("5 conjuntos de dados mudaram na última semana");
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

      // Simulate the generateEmailBodyNoChanges logic
      const freqKey = "week";
      let noChangesText = t.reportNoChanges.replace("{frequency}", freqKey);
      noChangesText = interpolateEmail(noChangesText, {
        watchedDatasetsUrl: `${baseUrl}/`,
      });

      // Verify the link was replaced
      expect(noChangesText).toContain('<a href="http://localhost:3000/"');
      expect(noChangesText).toContain(">watched datasets</a>");
      expect(noChangesText).toContain("in the last week");
      expect(noChangesText).not.toContain("{watchedDatasetsLink}");
    });

    it("generates complete Portuguese user report email with all links", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(ptTranslations));

      const t = await getEmailTranslations("pt-BR" as Locale);
      const baseUrl = "http://localhost:3000";

      // Simulate email generation
      const freqKey = "semana";
      let noChangesText = t.reportNoChanges.replace("{frequency}", freqKey);
      noChangesText = interpolateEmail(noChangesText, {
        watchedDatasetsUrl: `${baseUrl}/`,
        watchedDatasetsText: t.reportFollowed,
      });

      // Verify the link was replaced
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
