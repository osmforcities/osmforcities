"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Code, ExternalLink } from "lucide-react";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";
import { PILL_BUTTON_CLASS } from "@/components/dataset/pill-class";

export function OverpassQueryChip({ query }: { query: string }) {
  const t = useTranslations("DatasetPage");
  const [copyLabel, setCopyLabel] = useState<
    "queryCopy" | "queryCopied" | "queryCopyFailed"
  >("queryCopy");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(query);
      setCopyLabel("queryCopied");
    } catch (error) {
      console.error("Error copying Overpass query:", error);
      setCopyLabel("queryCopyFailed");
    }
  };

  return (
    <DialogTrigger onOpenChange={() => setCopyLabel("queryCopy")}>
      <Button className={PILL_BUTTON_CLASS}>
        <Code className="size-3 flex-shrink-0 text-gray-400" aria-hidden />
        <span className="font-medium text-gray-700">{t("queryChip")}</span>
      </Button>
      <Popover offset={6} className="outline-none">
        <Dialog
          aria-label={t("queryTitle")}
          className="w-[min(28rem,calc(100vw-2rem))] rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg outline-none"
        >
          <p className="font-medium text-gray-900">{t("queryTitle")}</p>
          <p className="mt-0.5 text-gray-600">{t("queryHelp")}</p>
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-50 p-2 font-mono text-[11px] leading-snug text-gray-800">
            {query}
          </pre>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Button
              onPress={copy}
              className="rounded border border-gray-200 px-2 py-1 font-medium hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-olive-500"
            >
              <span aria-live="polite">{t(copyLabel)}</span>
            </Button>
            <a
              href={`https://overpass-turbo.eu/?Q=${encodeURIComponent(query)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("queryOpenInTurboNewTab")}
              className="inline-flex items-center gap-1 font-medium text-olive-700 hover:underline"
            >
              {t("queryOpenInTurbo")}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
