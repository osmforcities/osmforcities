import { prisma } from "@/lib/db";
import { readStats } from "@/lib/dataset-stats";
import { resolveDatasetAreaName } from "@/lib/area-name";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { getDatasetUrl } from "@/lib/urls";
import { escapeHtml, getEmailBaseUrl, getEmailT, type Locale } from "@/lib/email-i18n";
import {
  emailButton,
  emailList,
  emailListItem,
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
  features: number;
  mappers?: number;
  daysRemaining?: number;
}

const MAX_REPORT_ROWS = 10;
const META_SEPARATOR = " · ";

async function generateEmailContent(
  changedDatasets: ReportDataset[],
  savedCount: number,
  frequency: "DAILY" | "WEEKLY",
  locale: Locale
): Promise<EmailContent> {
  const t = await getEmailT(locale);
  const baseUrl = getEmailBaseUrl();

  const subject = t("reportSubjectChanged", { count: changedDatasets.length, frequency });

  const formatDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const rows = changedDatasets
    // Pending deletions first, so the cap never hides a deletion warning.
    .toSorted(
      (a, b) =>
        Number(b.daysRemaining !== undefined) - Number(a.daysRemaining !== undefined) ||
        b.lastChanged.getTime() - a.lastChanged.getTime()
    )
    .slice(0, MAX_REPORT_ROWS)
    .map((ds) => {
      const meta = [
        t("reportLastEdit", { date: formatDate.format(ds.lastChanged) }),
        ds.features > 0 && t("reportFeatures", { count: ds.features }),
        ds.mappers && t("reportMappers", { count: ds.mappers }),
      ].filter(Boolean);
      return emailListItem({
        url: getDatasetUrl(baseUrl, { locale, areaId: ds.areaId, templateId: ds.templateId }),
        title: escapeHtml(ds.templateName),
        subtitle: escapeHtml(ds.areaName),
        meta: meta.join(META_SEPARATOR),
        action: t("reportOpen"),
        notice:
          ds.daysRemaining === undefined
            ? undefined
            : ds.daysRemaining === 0
              ? t("templateDeprecated")
              : t("templateDeprecatedDaysRemaining", { days: ds.daysRemaining }),
      });
    });

  const hidden = changedDatasets.length - rows.length;
  const body = [
    emailList(rows),
    hidden > 0 ? emailParagraph(t("reportMore", { count: hidden }), { muted: true }) : "",
    emailButton(`${baseUrl}/${locale}/dashboard`, t("reportOpenDashboard", { count: savedCount })),
  ].join("");

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
      dataCount: true,
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
    const stats = readStats(dataset);
    const lastChanged = new Date(stats?.mostRecentElement ?? NaN);
    if (Number.isNaN(lastChanged.getTime()) || lastChanged < since) return [];
    const { deprecatesAt } = dataset.template;
    return [
      {
        areaId: dataset.areaId,
        templateId: dataset.templateId,
        areaName: resolveDatasetAreaName(dataset, userLocale),
        templateName: resolveTemplateForLocale(dataset.template, userLocale).name,
        lastChanged,
        features: dataset.dataCount,
        mappers: stats?.editorsCount,
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
    recentDatasets.length,
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
