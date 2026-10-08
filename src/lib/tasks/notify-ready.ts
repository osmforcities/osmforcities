import { htmlToText } from "html-to-text";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  createEmailLink,
  escapeHtml,
  getEmailBaseUrl,
  getEmailT,
  isRTL,
  type Locale,
} from "@/lib/email-i18n";
import { resolveDatasetAreaName } from "@/lib/area-name";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { getDatasetUrl } from "@/lib/urls";

/**
 * Only the reconcile that won the `done` commit calls this. A failed send
 * keeps its flag for the next bake. Never throws.
 */
export async function notifyDatasetReady(
  datasetId: string,
  dataCount: number
): Promise<void> {
  if (dataCount <= 0) return;
  try {
    const saves = await prisma.datasetSave.findMany({
      where: { datasetId, notifyWhenReady: true },
      select: { id: true, user: { select: { email: true, language: true } } },
    });
    if (saves.length === 0) return;

    const dataset = await prisma.dataset.findUniqueOrThrow({
      where: { id: datasetId },
      select: {
        areaId: true,
        templateId: true,
        cityName: true,
        area: { select: { name: true, names: true } },
        template: {
          select: {
            name: true,
            description: true,
            translations: {
              select: { locale: true, name: true, description: true },
            },
          },
        },
      },
    });

    for (const save of saves) {
      try {
        const locale = (save.user.language || "en") as Locale;
        const names = {
          template: resolveTemplateForLocale(dataset.template, locale).name,
          area: resolveDatasetAreaName(dataset, locale),
        };
        const t = await getEmailT(locale);
        const url = getDatasetUrl(getEmailBaseUrl(), {
          locale,
          areaId: dataset.areaId,
          templateId: dataset.templateId,
        });
        const sentence = t("mapReady", {
          template: escapeHtml(names.template),
          area: escapeHtml(names.area),
        });
        const html = `<div lang="${locale}" dir="${isRTL(locale) ? "rtl" : "ltr"}"><p>${createEmailLink(url, sentence)}</p></div>`;

        await sendEmail({
          to: save.user.email,
          subject: t("mapReady", names),
          html,
          text: htmlToText(html),
        });
        // Conditional so an unsave mid-send is a no-op, not a throw.
        await prisma.datasetSave.updateMany({
          where: { id: save.id, notifyWhenReady: true },
          data: { notifyWhenReady: false },
        });
      } catch (error) {
        console.error(`Map-ready email failed for save ${save.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`Map-ready notify failed for dataset ${datasetId}:`, error);
  }
}
