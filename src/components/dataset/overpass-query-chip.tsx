"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Code, ExternalLink } from "lucide-react";
import { Button, Dialog, DialogTrigger, Heading, Popover } from "react-aria-components";
import { PILL_BUTTON_CLASS } from "@/components/dataset/dataset-timestamps";

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
          className="w-[min(28rem,calc(100vw-2rem))] rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg outline-none"
        >
          <Heading slot="title" className="font-medium">
            {t("queryTitle")}
          </Heading>
          <p className="mt-0.5 text-gray-300">{t("queryHelp")}</p>
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-white/10 p-2 font-mono text-[11px] leading-snug text-gray-100">
            {query}
          </pre>
          <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-white/15 pt-1.5">
            <Button
              onPress={copy}
              className="rounded border border-white/20 px-2 py-1 font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-olive-300"
            >
              <span aria-live="polite">{t(copyLabel)}</span>
            </Button>
            <a
              href={`https://overpass-turbo.eu/?Q=${encodeURIComponent(query)}&R`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("queryOpenInTurboNewTab")}
              className="inline-flex items-center gap-1 font-medium text-olive-300 hover:underline"
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
