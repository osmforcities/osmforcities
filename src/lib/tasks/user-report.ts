import { prisma } from "@/lib/db";
import { htmlToText } from "html-to-text";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import {
  getEmailTranslations,
  type Locale,
} from "@/lib/email-i18n";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface DatasetStatsData {
  mostRecentElement?: string;
  editorsCount?: number;
  elementVersionsCount?: number;
  changesetsCount?: number;
  oldestElement?: string;
  averageElementAge?: number;
  averageElementVersion?: number;
  recentActivity?: {
    elementsEdited: number;
    changesets: number;
    editors: number;
  };
  qualityMetrics?: {
    staleElementsCount: number;
    recentlyUpdatedElementsCount: number;
    staleElementsPercentage: number;
    recentlyUpdatedElementsPercentage: number;
  };
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
  }>;
}

function link(url: string, text: string): string {
  return `<a href="${url}" style="color: #007bff; text-decoration: none;">${text}</a>`;
}

function getBaseUrl(): string {
  return process.env.AUTH_URL || "https://osmforcities.com";
}

function formatUTCDate(date: Date | null): string {
  if (!date) return "Unknown";
  return date.toISOString().split("T")[0];
}

function generateEmailSubject(
  count: number,
  frequency: "DAILY" | "WEEKLY",
  t: Awaited<ReturnType<typeof getEmailTranslations>>
): string {
  if (count === 0) {
    const freqKey = frequency === "DAILY" ? t.day : t.week;
    return t.reportSubjectNoChanges.replace("{frequency}", freqKey);
  }

  const datasetsWord = count === 1 ? t.datasetsOne : t.datasetsOther;
  const freqKey = frequency === "DAILY" ? t.day : t.week;
  return t.reportSubjectChanged
    .replace("{count}", count.toString())
    .replace("{datasets}", datasetsWord)
    .replace("{frequency}", freqKey);
}

function generateEmailBodyWithChanges(
  recentDatasets: Array<{
    id: string;
    name: string;
    templateName: string;
    lastChanged: Date | null;
  }>,
  frequency: "DAILY" | "WEEKLY",
  t: Awaited<ReturnType<typeof getEmailTranslations>>
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
            `${link(
              `${getBaseUrl()}/dataset/${ds.id}`,
              `${ds.templateName} - ${ds.name}`
            )}`
        )
        .join("<br>");

      return `<strong>${dayFormatted}</strong><br>${datasetsList}`;
    })
    .join("<br><br>");

  const freqKey = frequency === "DAILY" ? t.day : t.week;
  const changedText = t.reportChanged.replace("{frequency}", freqKey);

  return `
    <p>${changedText}</p>

    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">${datasetsList}</div>`;
}

function generateEmailBodyNoChanges(
  frequency: "DAILY" | "WEEKLY",
  t: Awaited<ReturnType<typeof getEmailTranslations>>
): string {
  const freqKey = frequency === "DAILY" ? t.day : t.week;
  let noChangesText = t.reportNoChanges.replace("{frequency}", freqKey);

  // Replace the watched datasets link
  const watchedDatasetsLink = link(`${getBaseUrl()}/`, "watched datasets");
  noChangesText = noChangesText.replace(
    '<link>watched datasets</link>',
    watchedDatasetsLink
  );

  return `<p>${noChangesText}</p>`;
}

async function generateEmailContent(
  data: DatasetStats,
  userLocale: Locale
): Promise<EmailContent> {
  const { user, recentDatasets } = data;
  const frequency = user.reportsFrequency;
  const count = recentDatasets.length;

  const translations = await getEmailTranslations(userLocale);

  const subject = generateEmailSubject(count, frequency, translations);

  const emailBody = count > 0
    ? generateEmailBodyWithChanges(recentDatasets, frequency, translations)
    : generateEmailBodyNoChanges(frequency, translations);

  const timestamp = new Date().toISOString().split(".")[0];
  const generatedAtText = translations.generatedAt.replace("{timestamp}", timestamp);

  // Replace unsubscribe link
  const preferencesLink = link(`${getBaseUrl()}/preferences`, "visit your preferences page");
  const unsubscribeText = translations.unsubscribe.replace(
    '<link>visit your preferences page</link>',
    preferencesLink
  );

  const htmlContent = `
    <p>Hi!</p>

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
  const now = new Date();
  let since: Date;
  if (user.reportsFrequency === "DAILY") {
    since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

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

  const datasetsWithRecentChanges = recentDatasets.filter((dataset) => {
    if (!dataset.stats || typeof dataset.stats !== "object") return false;

    const stats = dataset.stats as DatasetStatsData;
    const mostRecentElement = stats.mostRecentElement;

    if (!mostRecentElement) return false;

    const lastChangeDate = new Date(mostRecentElement);
    return lastChangeDate >= since;
  });

  const datasetStats: DatasetStats = {
    user: {
      id: user.id,
      email: user.email,
      reportsFrequency: user.reportsFrequency,
      language: user.language,
    },
    recentDatasets: datasetsWithRecentChanges.map((dataset) => {
      const stats = dataset.stats as DatasetStatsData;
      const mostRecentElement = stats.mostRecentElement;

      // Resolve template name for user's locale
      const resolvedTemplate = resolveTemplateForLocale(
        dataset.template,
        userLocale
      );

      return {
        id: dataset.id,
        name: dataset.cityName,
        templateName: resolvedTemplate.name,
        lastChanged: mostRecentElement ? new Date(mostRecentElement) : null,
      };
    }),
  };

  // Don't send email if user has no watched datasets or no recent updates
  if (datasetsWithRecentChanges.length === 0) {
    return null;
  }

  const emailContent = await generateEmailContent(datasetStats, userLocale);
  const latestChangeDate =
    datasetsWithRecentChanges.length > 0
      ? datasetsWithRecentChanges[0].stats &&
        typeof datasetsWithRecentChanges[0].stats === "object"
        ? (() => {
            const stats = datasetsWithRecentChanges[0]
              .stats as DatasetStatsData;
            return stats.mostRecentElement
              ? new Date(stats.mostRecentElement).toLocaleDateString()
              : null;
          })()
        : null
      : null;

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
