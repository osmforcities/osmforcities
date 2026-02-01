import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  replaceHtmlTags,
  pluralize,
} from "../email-i18n";

const mockMessages = {
  en: {
    Email: {
      magicLinkSubject: "Sign in to OSM for Cities",
      magicLinkBody: "Click <link>here</link> to sign in.",
      reportSubjectChanged: "{count} datasets changed in the last {frequency}",
      reportSubjectNoChanges: "No changes in the last {frequency}",
      reportChanged: "The following datasets were updated in the last {frequency}:",
      reportNoChanges: "There were no changes to your watched datasets in the last {frequency}.",
      reportFollowed: "<link>watched datasets</link>",
      day: "day",
      week: "week",
      generatedAt: "This report was generated at {timestamp}Z.",
      unsubscribe: "To unsubscribe, {action}.",
      visitPreferences: "<link>visit your preferences page</link>",
      datasetsOne: "dataset",
      datasetsOther: "datasets",
      changedLast: "{count} datasets changed in the last {frequency}",
    },
  },
  "pt-BR": {
    Email: {
      magicLinkSubject: "Entrar no OSM for Cities",
      magicLinkBody: "Clique <link>aqui</link> para entrar.",
      reportSubjectChanged: "{count} conjuntos de dados mudaram na última {frequency}",
      reportSubjectNoChanges: "Sem mudanças na última {frequency}",
      reportChanged: "Os seguintes conjuntos de dados foram atualizados na última {frequency}:",
      reportNoChanges: "Não houve mudanças nos seus conjuntos de dados observados na última {frequency}.",
      reportFollowed: "<link>conjuntos de dados observados</link>",
      day: "dia",
      week: "semana",
      generatedAt: "Este relatório foi gerado em {timestamp}Z.",
      unsubscribe: "Para cancelar a inscrição, {action}.",
      visitPreferences: "<link>visite sua página de preferências</link>",
      datasetsOne: "conjunto de dados",
      datasetsOther: "conjuntos de dados",
      changedLast: "{count} conjuntos de dados mudaram na última {frequency}",
    },
  },
  es: {
    Email: {
      magicLinkSubject: "Iniciar sesión en OSM for Cities",
      magicLinkBody: "Haz clic <link>aquí</link> para iniciar sesión.",
      reportSubjectChanged: "{count} conjuntos de datos cambiaron en la última {frequency}",
      reportSubjectNoChanges: "Sin cambios en la última {frequency}",
      reportChanged: "Los siguientes conjuntos de datos se actualizaron en la última {frequency}:",
      reportNoChanges: "No hubo cambios en tus conjuntos de datos monitoreados en la última {frequency}.",
      reportFollowed: "<link>conjuntos de datos monitoreados</link>",
      day: "día",
      week: "semana",
      generatedAt: "Este reporte se generó en {timestamp}Z.",
      unsubscribe: "Para cancelar la suscripción, {action}.",
      visitPreferences: "<link>visita tu página de preferencias</link>",
      datasetsOne: "conjunto de datos",
      datasetsOther: "conjuntos de datos",
      changedLast: "{count} conjuntos de datos cambiaron en la última {frequency}",
    },
  },
};

// Mock the file system
vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

import { promises as fs } from "fs";

describe("email-i18n", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the module cache to reset state
    vi.resetModules();
  });

  describe("getEmailTranslations", () => {
    it("returns English translations for en locale", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(
        JSON.stringify(mockMessages.en)
      );

      const { getEmailTranslations } = await import("../email-i18n");
      const translations = await getEmailTranslations("en");

      expect(translations.magicLinkSubject).toBe("Sign in to OSM for Cities");
      expect(translations.magicLinkBody).toBe("Click <link>here</link> to sign in.");
      expect(translations.day).toBe("day");
      expect(translations.week).toBe("week");
    });

    it("returns Portuguese translations for pt-BR locale", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(
        JSON.stringify(mockMessages["pt-BR"])
      );

      const { getEmailTranslations } = await import("../email-i18n");
      const translations = await getEmailTranslations("pt-BR");

      expect(translations.magicLinkSubject).toBe("Entrar no OSM for Cities");
      expect(translations.magicLinkBody).toBe("Clique <link>aqui</link> para entrar.");
      expect(translations.day).toBe("dia");
      expect(translations.week).toBe("semana");
    });

    it("returns Spanish translations for es locale", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(
        JSON.stringify(mockMessages.es)
      );

      const { getEmailTranslations } = await import("../email-i18n");
      const translations = await getEmailTranslations("es");

      expect(translations.magicLinkSubject).toBe("Iniciar sesión en OSM for Cities");
      expect(translations.magicLinkBody).toBe("Haz clic <link>aquí</link> para iniciar sesión.");
      expect(translations.day).toBe("día");
      expect(translations.week).toBe("semana");
    });

    it("falls back to English defaults when Email namespace missing", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(
        JSON.stringify({ Index: { title: "Test" } })
      );

      const { getEmailTranslations } = await import("../email-i18n");
      const translations = await getEmailTranslations("en");

      expect(translations.magicLinkSubject).toBe("Sign in to OSM for Cities");
      expect(translations.magicLinkBody).toBe("Click <link>here</link> to sign in.");
    });

    it("returns all required translation keys", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(
        JSON.stringify(mockMessages.en)
      );

      const { getEmailTranslations } = await import("../email-i18n");
      const translations = await getEmailTranslations("en");

      const expectedKeys = [
        "magicLinkSubject",
        "magicLinkBody",
        "reportSubjectChanged",
        "reportSubjectNoChanges",
        "reportChanged",
        "reportNoChanges",
        "reportFollowed",
        "day",
        "week",
        "generatedAt",
        "unsubscribe",
        "visitPreferences",
        "datasetsOne",
        "datasetsOther",
        "changedLast",
      ] as const;

      for (const key of expectedKeys) {
        expect(typeof translations[key]).toBe("string");
      }
    });

    it("caches loaded messages", async () => {
      // Use a consistent mock value (not Once) to allow multiple calls
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify(mockMessages.en)
      );

      const { getEmailTranslations } = await import("../email-i18n");

      await getEmailTranslations("en");
      await getEmailTranslations("en");

      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe("replaceHtmlTags", () => {
    it("replaces single link tag with anchor tag", () => {
      const html = "Click <link>here</link> to continue.";
      const replacements = [
        { placeholder: "here", url: "https://example.com", text: "here" },
      ];

      const result = replaceHtmlTags(html, replacements);

      expect(result).toBe(
        'Click <a href="https://example.com" style="color: #007bff; text-decoration: none;">here</a> to continue.'
      );
    });

    it("replaces multiple link tags", () => {
      const html = "<link>Watched datasets</link> and <link>preferences</link>.";
      const replacements = [
        { placeholder: "Watched datasets", url: "/watched", text: "Watched datasets" },
        { placeholder: "preferences", url: "/preferences", text: "preferences" },
      ];

      const result = replaceHtmlTags(html, replacements);

      expect(result).toContain('href="/watched"');
      expect(result).toContain('href="/preferences"');
    });

    it("handles missing placeholder gracefully", () => {
      const html = "Click <link>here</link> to continue.";
      const replacements = [
        { placeholder: "nowhere", url: "https://example.com", text: "link" },
      ];

      const result = replaceHtmlTags(html, replacements);

      // Original tag should remain if placeholder not found
      expect(result).toBe("Click <link>here</link> to continue.");
    });

    it("handles empty replacements array", () => {
      const html = "Click <link>here</link> to continue.";
      const result = replaceHtmlTags(html, []);

      expect(result).toBe("Click <link>here</link> to continue.");
    });

    it("preserves style attribute in anchor tag", () => {
      const html = "<link>click here</link>";
      const replacements = [
        { placeholder: "click here", url: "https://test.com", text: "click here" },
      ];

      const result = replaceHtmlTags(html, replacements);

      expect(result).toContain('style="color: #007bff; text-decoration: none;"');
    });
  });

  describe("pluralize", () => {
    it("returns singular form for count of 1", () => {
      const result = pluralize(1, "dataset", "datasets");
      expect(result).toBe("dataset");
    });

    it("returns plural form for count of 0", () => {
      const result = pluralize(0, "dataset", "datasets");
      expect(result).toBe("datasets");
    });

    it("returns plural form for count greater than 1", () => {
      const result = pluralize(5, "dataset", "datasets");
      expect(result).toBe("datasets");
    });

    it("handles large numbers", () => {
      const result = pluralize(1000, "item", "items");
      expect(result).toBe("items");
    });
  });
});
