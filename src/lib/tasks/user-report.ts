import { prisma } from "@/lib/db";
import { htmlToText } from "html-to-text";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import {
  createEmailLink,
  getEmailTranslations,
  interpolateEmail,
  type Locale,
} from "@/lib/email-i18n";

/** Email with subject line, HTML body, and plain text fallback. */
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface DatasetStatsData {
  mostRecentElement?: string;
}

interface DatasetStats {
  user: {
    id: string;
    email: string;
    reportsFrequency: "DAILY" | "WEEKLY";
    language: string | null;
  };
  recentDatasets: Array<{
    id: string;
    name: string;
    templateName: string;
    lastChanged: Date | null;
    daysRemaining?: number;
  }>;
}

function getBaseUrl(): string {
  return process.env.AUTH_URL || "https://osmforcities.com";
}

function formatUTCDate(date: Date | null): string {
  if (!date) return "Unknown";
  return date.toISOString().split("T")[0];
}

function getLatestChangeDate(datasets: Array<{ stats?: DatasetStatsData }>): string | null {
  const stats = datasets[0]?.stats as DatasetStatsData | undefined;
  return stats?.mostRecentElement
    ? new Date(stats.mostRecentElement).toLocaleDateString()
    : null;
}

function generateEmailBodyWithChanges(
  recentDatasets: Array<{
    id: string;
    name: string;
    templateName: string;
    lastChanged: Date | null;
    daysRemaining?: number;
  }>,
  frequency: "DAILY" | "WEEKLY",
  changedText: string,
  deprecationText?: string
): string {
  const datasetsByDay = new Map<
    string,
    Array<{
      id: string;
      name: string;
      templateName: string;
    }>
  >();

  recentDatasets.forEach((ds) => {
    const dayKey = ds.lastChanged
      ? ds.lastChanged.toISOString().split("T")[0]
      : "Unknown";
    if (!datasetsByDay.has(dayKey)) {
      datasetsByDay.set(dayKey, []);
    }
    datasetsByDay.get(dayKey)!.push({
      id: ds.id,
      name: ds.name,
      templateName: ds.templateName,
    });
  });

  const sortedDays = Array.from(datasetsByDay.keys()).sort().reverse();

  const datasetsList = sortedDays
    .map((day) => {
      const datasets = datasetsByDay.get(day)!;
      const dayFormatted = formatUTCDate(new Date(day + "T00:00:00Z"));
      const datasetsList = datasets
        .map(
          (ds) =>
            `${createEmailLink(
              `${getBaseUrl()}/dataset/${ds.id}`,
              `${ds.templateName} - ${ds.name}`
            )}`
        )
        .join("<br>");

      return `<strong>${dayFormatted}</strong><br>${datasetsList}`;
    })
    .join("<br><br>");

  let deprecationNotice = "";
  if (deprecationText) {
    deprecationNotice = `<div style="background: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffc107; margin-bottom: 20px;">${deprecationText}</div>`;
  }

  return `
    <p>${changedText}</p>

    ${deprecationNotice}
    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">${datasetsList}</div>`;
}

async function generateEmailContent(
  data: DatasetStats,
  userLocale: Locale
): Promise<EmailContent> {
  const { user, recentDatasets } = data;
  const frequency = user.reportsFrequency;
  const count = recentDatasets.length;

  const translations = await getEmailTranslations(userLocale);

  // Generate subject using ICU plural format
  const freqValue = frequency === "DAILY" ? translations.day : translations.week;
  const subjectKey = count === 0 ? "reportSubjectNoChanges" : "reportSubjectChanged";
  const subjectTemplate = translations[subjectKey];
  const subject = interpolateEmail(subjectTemplate, {
    count,
    frequency: freqValue,
    datasetsOne: translations.datasetsOne,
    datasetsOther: translations.datasetsOther,
  });

  // Check if any datasets use deprecated templates
  const deprecatedDatasets = recentDatasets.filter((ds) => ds.daysRemaining !== undefined);
  let deprecationNotice: string | undefined;
  if (deprecatedDatasets.length > 0) {
    const ds = deprecatedDatasets[0];
    deprecationNotice = interpolateEmail(translations.templateDeprecatedDaysRemaining, {
      days: ds.daysRemaining!,
    });
  }

  // Generate body
  const emailBody = count > 0
    ? generateEmailBodyWithChanges(
        recentDatasets,
        frequency,
        translations.reportChanged.replace("{frequency}", freqValue),
        deprecationNotice
      )
    : interpolateEmail(translations.reportNoChanges, {
        frequency: freqValue,
        watchedDatasetsUrl: `${getBaseUrl()}/`,
        watchedDatasetsText: translations.reportFollowed,
      });

  // Generate footer
  const timestamp = new Date().toISOString().split(".")[0];
  const generatedAtText = translations.generatedAt.replace(
    "{timestamp}",
    timestamp
  );
  const unsubscribeText = interpolateEmail(translations.unsubscribe, {
    preferencesUrl: `${getBaseUrl()}/preferences`,
    preferencesText: translations.preferencesPage,
  });

  const htmlContent = `
    <p>${translations.greeting}</p>

    ${emailBody}

    <p style="color: #999; font-size: 12px;">
      ${generatedAtText}
    </p>
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
    <p style="color: #666; font-size: 14px;">
      ${unsubscribeText}
    </p>
  `;

  return {
    subject,
    html: htmlContent,
    text: htmlToText(htmlContent),
  };
}

/** Generates next due user report email. Returns null if no user is due. */
export async function generateNextUserReport(): Promise<{
  userId: string;
  userEmail: string;
  userLanguage: Locale;
  emailContent: EmailContent;
  reportData: {
    reportsFrequency: "DAILY" | "WEEKLY";
    totalDatasets: number;
    publicDatasetsCount: number;
    latestChangeDate: string | null;
  };
} | null> {
  const user = await prisma.user.findFirst({
    where: {
      reportsEnabled: true,
      emailVerified: { not: null },
      OR: [
        { lastReportSent: null },
        {
          AND: [
            { reportsFrequency: "DAILY" },
            {
              lastReportSent: {
                lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
        {
          AND: [
            { reportsFrequency: "WEEKLY" },
            {
              lastReportSent: {
                lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      email: true,
      reportsFrequency: true,
      language: true,
    },
  });

  if (!user) {
    return null;
  }

  const userLocale = (user.language || "en") as Locale;
  const since = new Date(
    Date.now() - (user.reportsFrequency === "DAILY" ? 24 : 7 * 24) * 60 * 60 * 1000
  );

  const recentDatasets = await prisma.dataset.findMany({
    where: {
      watchers: {
        some: {
          userId: user.id,
        },
      },
    },
    select: {
      id: true,
      cityName: true,
      stats: true,
      template: {
        select: {
          name: true,
          description: true,
          deprecatesAt: true,
          translations: {
            select: {
              locale: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const datasetsWithRecentChanges = recentDatasets
    .filter((dataset) => {
      if (!dataset.stats || typeof dataset.stats !== "object") return false;

      const stats = dataset.stats as DatasetStatsData;
      const mostRecentElement = stats.mostRecentElement;

      if (!mostRecentElement) return false;

      const lastChangeDate = new Date(mostRecentElement);
      return lastChangeDate >= since;
    })
    .map((d) => ({ ...d, stats: d.stats as DatasetStatsData }));

  const datasetStats: DatasetStats = {
    user: {
      id: user.id,
      email: user.email,
      reportsFrequency: user.reportsFrequency,
      language: user.language,
    },
    recentDatasets: datasetsWithRecentChanges.map((dataset) => {
      const mostRecentElement = dataset.stats.mostRecentElement;

      // Resolve template name for user's locale
      const resolvedTemplate = resolveTemplateForLocale(
        dataset.template,
        userLocale
      );

      // Calculate days remaining if template is deprecated
      let daysRemaining: number | undefined;
      if (dataset.template.deprecatesAt) {
        daysRemaining = Math.ceil(
          (new Date(dataset.template.deprecatesAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );
        if (daysRemaining < 0) daysRemaining = 0;
      }

      return {
        id: dataset.id,
        name: dataset.cityName,
        templateName: resolvedTemplate.name,
        lastChanged: mostRecentElement ? new Date(mostRecentElement) : null,
        daysRemaining,
      };
    }),
  };

  // Don't send email if user has no watched datasets or no recent updates
  if (datasetsWithRecentChanges.length === 0) {
    return null;
  }

  const emailContent = await generateEmailContent(datasetStats, userLocale);
  const latestChangeDate = getLatestChangeDate(datasetsWithRecentChanges);

  return {
    userId: user.id,
    userEmail: user.email,
    userLanguage: userLocale,
    emailContent,
    reportData: {
      reportsFrequency: user.reportsFrequency,
      totalDatasets: datasetStats.recentDatasets.length,
      publicDatasetsCount: datasetStats.recentDatasets.length,
      latestChangeDate,
    },
  };
}
