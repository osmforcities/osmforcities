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
  /** Set once the template left the catalog; the dataset is deleted after it. */
  retiresAt?: Date;
}

const MAX_REPORT_ROWS = 5;

async function generateEmailContent(
  changedDatasets: ReportDataset[],
  frequency: "DAILY" | "WEEKLY",
  locale: Locale
): Promise<EmailContent> {
  const t = await getEmailT(locale);
  const baseUrl = getEmailBaseUrl();

  const subject = t("reportSubjectChanged", { count: changedDatasets.length, frequency });

  const now = new Date();
  const glyph = (name: string) => `${baseUrl}/api/email-icon?glyph=${name}`;
  const thisYear = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  const otherYear = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const formatShortDate = (date: Date) =>
    (date.getUTCFullYear() === now.getUTCFullYear() ? thisYear : otherYear).format(date);
  const formatLongDate = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });

  const rows = changedDatasets
    // Retiring datasets first, so the cap never hides a deletion warning.
    .toSorted(
      (a, b) =>
        Number(b.retiresAt !== undefined) - Number(a.retiresAt !== undefined) ||
        b.lastChanged.getTime() - a.lastChanged.getTime()
    )
    .slice(0, MAX_REPORT_ROWS)
    .map((ds) => {
      const title = escapeHtml(ds.templateName);
      const stats = [
        { iconUrl: glyph("calendar"), text: t("reportLastEdit", { date: formatShortDate(ds.lastChanged) }) },
        ...(ds.features > 0
          ? [{ iconUrl: glyph("features"), text: t("reportFeatures", { count: ds.features }) }]
          : []),
        ...(ds.mappers ? [{ iconUrl: glyph("mappers"), text: t("reportMappers", { count: ds.mappers }) }] : []),
      ];
      const icon = new URLSearchParams({ template: ds.templateId });
      return emailListItem({
        // A retired template's dataset page already shows "not found".
        link: ds.retiresAt
          ? undefined
          : {
              url: getDatasetUrl(baseUrl, { locale, areaId: ds.areaId, templateId: ds.templateId }),
              action: t("reportOpen"),
            },
        iconUrl: escapeHtml(`${baseUrl}/api/email-icon?${icon}`),
        title,
        subtitle: escapeHtml(ds.areaName),
        stats,
        warning: ds.retiresAt && {
          iconUrl: glyph("alert"),
          title: t("reportRetiredTitle"),
          // "soon" is the message's select branch for a date already past.
          body: t("reportRetiredBody", {
            template: title,
            date: ds.retiresAt > now ? formatLongDate.format(ds.retiresAt) : "soon",
          }),
        },
      });
    });

  const hidden = changedDatasets.length - rows.length;
  const body = [
    emailList(rows),
    hidden > 0 ? emailParagraph(t("reportMore", { count: hidden }), { muted: true }) : "",
    emailButton(`${baseUrl}/${locale}/dashboard`, t("reportGoToDashboard")),
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
    return [
      {
        areaId: dataset.areaId,
        templateId: dataset.templateId,
        areaName: resolveDatasetAreaName(dataset, userLocale),
        templateName: resolveTemplateForLocale(dataset.template, userLocale).name,
        lastChanged,
        features: dataset.dataCount,
        mappers: stats?.editorsCount,
        retiresAt: dataset.template.deprecatesAt ?? undefined,
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
  const latestChange = Math.max(...reportDatasets.map((ds) => ds.lastChanged.getTime()));
  const latestChangeDate = new Date(latestChange).toLocaleDateString();

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
