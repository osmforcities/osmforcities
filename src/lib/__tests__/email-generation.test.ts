import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isRTL,
  getEmailT,
  formatEmail,
  createEmailLink,
  type Locale,
} from "../email-i18n";

// Mock the file system
vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

import { promises as fs } from "fs";

const enMessages = {
  Email: {
    magicLinkSubject: "Sign in to OSM for Cities",
    magicLinkBody: "Click {magicLink} to sign in.",
    reportSubjectChanged: "{count} {datasets} changed {lastPeriod}",
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
    templateDeprecated: "This template was removed from the catalog.",
    templateDeprecatedDaysRemaining:
      "You have {days} day{days, plural, =1 {} other {s}} remaining before this dataset is deleted.",
    greeting: "Hi!",
  },
};

const ptMessages = {
  Email: {
    magicLinkSubject: "Entrar no OSM for Cities",
    magicLinkBody: "Clique {magicLink} para entrar.",
    reportSubjectChanged:
      "{count} {datasets} mudaram {lastPeriod}",
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
    templateDeprecated: "Este modelo foi removido do catálogo.",
    templateDeprecatedDaysRemaining:
      "Você tem {days} dia{days, plural, =1 {} other {s}} restantes antes que este conjunto de dados seja excluído.",
    greeting: "Olá!",
  },
};

const esMessages = {
  Email: {
    magicLinkSubject: "Iniciar sesión en OSM for Cities",
    magicLinkBody: "Haz clic {magicLink} para iniciar sesión.",
    reportSubjectChanged:
      "{count} {datasets} cambiaron {lastPeriod}",
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
    templateDeprecated: "Esta plantilla fue eliminada del catálogo.",
    templateDeprecatedDaysRemaining:
      "Tienes {days} día{days, plural, =1 {} other {s}} restantes antes de que este conjunto de datos sea eliminado.",
    greeting: "¡Hola!",
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
    vi.resetAllMocks();
  });

  describe("English", () => {
    it("translates plain strings", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(enMessages));
      const t = await getEmailT("en");
      expect(t("greeting")).toBe("Hi!");
      expect(t("lastPeriodDay")).toBe("in the last day");
      expect(t("lastPeriodWeek")).toBe("in the last week");
    });

    it("subject with count=1 uses singular dataset", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(enMessages));
      const t = await getEmailT("en");
      const result = t("reportSubjectChanged", {
        count: 1,
        datasets: "dataset",
        lastPeriod: "in the last day",
      });
      expect(result).toBe("1 dataset changed in the last day");
    });

    it("subject with count=5 uses plural datasets", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(enMessages));
      const t = await getEmailT("en");
      const result = t("reportSubjectChanged", {
        count: 5,
        datasets: "datasets",
        lastPeriod: "in the last week",
      });
      expect(result).toBe("5 datasets changed in the last week");
    });

    it("templateDeprecatedDaysRemaining ICU plural: days=1", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(enMessages));
      const t = await getEmailT("en");
      const result = t("templateDeprecatedDaysRemaining", { days: 1 });
      expect(result).toBe("You have 1 day remaining before this dataset is deleted.");
    });

    it("templateDeprecatedDaysRemaining ICU plural: days=5", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(enMessages));
      const t = await getEmailT("en");
      const result = t("templateDeprecatedDaysRemaining", { days: 5 });
      expect(result).toBe("You have 5 days remaining before this dataset is deleted.");
    });

    it("passes HTML link values through unescaped", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(enMessages));
      const t = await getEmailT("en");
      const link = createEmailLink("http://localhost:3000/", "watched datasets");
      const result = t("reportNoChanges", {
        watchedDatasetsLink: link,
        lastPeriod: "in the last week",
      });
      expect(result).toContain('<a href="http://localhost:3000/"');
      expect(result).toContain(">watched datasets</a>");
      expect(result).not.toContain("{watchedDatasetsLink}");
    });
  });

  describe("Spanish", () => {
    it("count=1 singular", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(esMessages));
      const t = await getEmailT("es");
      const result = t("reportSubjectChanged", {
        count: 1,
        datasets: "conjunto de datos",
        lastPeriod: "en el último día",
      });
      expect(result).toBe("1 conjunto de datos cambiaron en el último día");
    });

    it("count=5 plural", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(esMessages));
      const t = await getEmailT("es");
      const result = t("reportSubjectChanged", {
        count: 5,
        datasets: "conjuntos de datos",
        lastPeriod: "en la última semana",
      });
      expect(result).toBe("5 conjuntos de datos cambiaron en la última semana");
    });
  });

  describe("Portuguese", () => {
    it("count=1 singular", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(ptMessages));
      const t = await getEmailT("pt-BR" as Locale);
      const result = t("reportSubjectChanged", {
        count: 1,
        datasets: "conjunto de dados",
        lastPeriod: "no último dia",
      });
      expect(result).toBe("1 conjunto de dados mudaram no último dia");
    });

    it("count=5 plural", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(ptMessages));
      const t = await getEmailT("pt-BR" as Locale);
      const result = t("reportSubjectChanged", {
        count: 5,
        datasets: "conjuntos de dados",
        lastPeriod: "na última semana",
      });
      expect(result).toBe("5 conjuntos de dados mudaram na última semana");
    });
  });
});

describe("formatEmail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("magic link email in English passes HTML link through", async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(enMessages));
    const magicLink = "http://localhost:3000/api/auth/verify?token=test123";
    const result = await formatEmail("en", "magicLinkBody", {
      magicLink: createEmailLink(magicLink, "link"),
    });
    expect(result).toContain(`<a href="${magicLink}"`);
    expect(result).toContain(">link</a>");
    expect(result).not.toContain("{magicLink}");
  });

  it("magic link email in Portuguese", async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(ptMessages));
    const magicLink = "http://localhost:3000/api/auth/verify?token=test123";
    const result = await formatEmail("pt-BR" as Locale, "magicLinkBody", {
      magicLink: createEmailLink(magicLink, "link"),
    });
    expect(result).toContain(`<a href="${magicLink}"`);
    expect(result).toContain(">link</a>");
  });

  it("magic link email in Spanish", async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(esMessages));
    const magicLink = "http://localhost:3000/api/auth/verify?token=test123";
    const result = await formatEmail("es" as Locale, "magicLinkBody", {
      magicLink: createEmailLink(magicLink, "link"),
    });
    expect(result).toContain(`<a href="${magicLink}"`);
    expect(result).toContain(">link</a>");
  });
});
