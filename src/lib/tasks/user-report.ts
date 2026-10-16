import { prisma } from "@/lib/db";
import { readStats } from "@/lib/dataset-stats";
import { resolveDatasetAreaName } from "@/lib/area-name";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { getDatasetUrl } from "@/lib/urls";
import { escapeHtml, getEmailBaseUrl, getEmailT, type Locale } from "@/lib/email-i18n";
import {
  createEmailLink,
  emailNotice,
  emailParagraph,
  emailPreferencesLine,
  renderEmail,
} from "@/lib/email-layout";

/** Email with subject line, HTML body, and plain text fallback. */
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface ReportDataset {
  areaId: number;
  templateId: string;
  areaName: string;
  templateName: string;
  lastChanged: Date;
  daysRemaining?: number;
}

async function generateEmailContent(
  recentDatasets: ReportDataset[],
  frequency: "DAILY" | "WEEKLY",
  locale: Locale
): Promise<EmailContent> {
  const t = await getEmailT(locale);

  const subject = t("reportSubjectChanged", { count: recentDatasets.length, frequency });

  const formatDay = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
  const datasetsByDay = Map.groupBy(recentDatasets, (ds) =>
    ds.lastChanged.toISOString().slice(0, 10)
  );
  const days = [...datasetsByDay.keys()].sort().reverse();

  const body = days
    .map((day) => {
      const group = datasetsByDay.get(day)!;
      const datasets = group.map((ds) => {
        const name = t("reportDataset", {
          template: escapeHtml(ds.templateName),
          area: escapeHtml(ds.areaName),
        });
        const url = getDatasetUrl(getEmailBaseUrl(), {
          locale,
          areaId: ds.areaId,
          templateId: ds.templateId,
        });
        const link = emailParagraph(createEmailLink(url, name));
        if (ds.daysRemaining === undefined) return link;
        const notice =
          ds.daysRemaining === 0
            ? t("templateDeprecated")
            : t("templateDeprecatedDaysRemaining", { days: ds.daysRemaining });
        return link + emailNotice(notice);
      });
      const dayLabel = formatDay.format(group[0].lastChanged);
      return emailParagraph(`<strong>${dayLabel}</strong>`) + datasets.join("");
    })
    .join("");

  const timestamp = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date());

  const { html, text } = renderEmail({
    locale,
    heading: subject,
    body,
    footer: [t("generatedAt", { timestamp }), emailPreferencesLine(t, locale)],
  });

  return { subject, html, text };
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
      savedDatasets: { some: {} },
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
      savedBy: {
        some: {
          userId: user.id,
        },
      },
    },
    select: {
      id: true,
      areaId: true,
      templateId: true,
      cityName: true,
      stats: true,
      area: { select: { name: true, names: true } },
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

  const reportDatasets = recentDatasets.flatMap((dataset): ReportDataset[] => {
    const lastChanged = new Date(readStats(dataset)?.mostRecentElement ?? NaN);
    if (Number.isNaN(lastChanged.getTime()) || lastChanged < since) return [];
    const { deprecatesAt } = dataset.template;
    return [
      {
        areaId: dataset.areaId,
        templateId: dataset.templateId,
        areaName: resolveDatasetAreaName(dataset, userLocale),
        templateName: resolveTemplateForLocale(dataset.template, userLocale).name,
        lastChanged,
        daysRemaining: deprecatesAt
          ? Math.max(
              0,
              Math.ceil((deprecatesAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
            )
          : undefined,
      },
    ];
  });

  // Don't send email if no recent updates, but DO update lastReportSent
  // Note: Users with no watched datasets are excluded by the query filter
  if (reportDatasets.length === 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastReportSent: new Date() },
    });
    return null;
  }

  const emailContent = await generateEmailContent(
    reportDatasets,
    user.reportsFrequency,
    userLocale
  );
  const latestChangeDate = reportDatasets[0]?.lastChanged.toLocaleDateString() ?? null;

  return {
    userId: user.id,
    userEmail: user.email,
    userLanguage: userLocale,
    emailContent,
    reportData: {
      reportsFrequency: user.reportsFrequency,
      totalDatasets: reportDatasets.length,
      publicDatasetsCount: reportDatasets.length,
      latestChangeDate,
    },
  };
}

/** Checks if user exists and can be updated (dry-run for markReportSent). */
export async function canUpdateReportSent(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return user !== null;
}

/** Updates lastReportSent timestamp for a user. Call after successful email send. */
export async function markReportSent(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastReportSent: new Date() },
  });
}
