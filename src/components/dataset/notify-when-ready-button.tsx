"use client";

import { useState, type ReactNode } from "react";
import { Check, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotifyWhenReadyButtonProps = {
  /** Records the request. Omitted until the notification backend exists. */
  onSave?: () => Promise<void> | void;
  /** Deletes the save, which also cancels the email. No control without it. */
  onUnsave?: () => Promise<void> | void;
  /** Already saved on an earlier visit. */
  saved?: boolean;
  /** Whether that earlier save asked for the email. */
  notify?: boolean;
  /**
   * What the email is conditional on. "ready" is a bake in flight. The other
   * two may never happen (a too-large dataset bakes only if the data shrinks,
   * an empty one only if someone maps it), so their sublines say "if".
   */
  offer?: keyof typeof OFFER_SUB;
  /** Holds the button's place before the dataset exists to save. */
  disabled?: boolean;
};

// Same width as the progress bar above it. A floor, not a fixed height: on a
// phone the subline wraps.
const BOX = "min-h-14 w-full max-w-sm justify-center gap-3 py-2 whitespace-normal";

// "e-mail" must not split at its hyphen. Scoped to that word so other hyphens
// a translation adds still wrap.
const keepEmailWhole = (text: string) =>
  text.replace(/\b(e)-(mail)/gi, "$1\u2011$2");

const OFFER_SUB = {
  ready: "notifySub",
  available: "notifySubIfAvailable",
  mapped: "notifySubIfMapped",
} as const;

/**
 * Fixed text width in both states so the icon stays put when the offer turns
 * into the confirmation. Every locale's subline fits it on one line from `sm` up.
 */
function IconTitleSub({
  icon,
  disc,
  title,
  sub,
  subTone,
}: {
  icon: ReactNode;
  disc: string;
  title: string;
  sub?: string;
  subTone?: string;
}) {
  return (
    <>
      <span
        className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", disc)}
      >
        {icon}
      </span>
      <span className="flex w-68 min-w-0 flex-col text-start">
        <span className="font-semibold">{keepEmailWhole(title)}</span>
        {sub && (
          <span className={cn("text-xs font-normal sm:whitespace-nowrap", subTone)}>
            {keepEmailWhole(sub)}
          </span>
        )}
      </span>
    </>
  );
}

/**
 * Saving a dataset is what keeps it on the retry schedule and what carries the
 * one-shot email, so the button does both in one press. Unsaving is the undo:
 * where no other save control exists (the no-map screens), pass `onUnsave`.
 * The address is never shown, so the page stays safe to read over someone's
 * shoulder.
 */
export function NotifyWhenReadyButton({
  onSave,
  onUnsave,
  saved = false,
  notify = true,
  offer = "ready",
  disabled = false,
}: NotifyWhenReadyButtonProps) {
  const t = useTranslations("DatasetPage");
  const [confirmed, setConfirmed] = useState(saved);
  // Any press from here on asks for the email.
  const [notifying, setNotifying] = useState(notify);
  const [sending, setSending] = useState(false);

  const submit = async (
    request: (() => Promise<void> | void) | undefined,
    confirmedAfter: boolean
  ) => {
    setSending(true);
    try {
      await request?.();
      setConfirmed(confirmedAfter);
      setNotifying(true);
    } catch {
      // Keep the current state so the same control can simply be pressed
      // again; wording for a failed request belongs with the backend that
      // can explain it.
    } finally {
      setSending(false);
    }
  };

  if (confirmed) {
    // Same box as the button it replaces, so the panel keeps its height and
    // the confirmation lands exactly where the press happened.
    const status = (
      <p
        role="status"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          BOX,
          "pointer-events-none cursor-default border-olive-300 bg-olive-50 text-olive-700"
        )}
      >
        <IconTitleSub
          icon={<Check className="size-5" aria-hidden />}
          disc="bg-olive-200"
          title={t("savedTitle")}
          sub={notifying ? t("notifyConfirmedSub") : undefined}
          subTone="text-olive-600"
        />
      </p>
    );
    if (!onUnsave) return status;
    return (
      <div className="flex w-full flex-col items-center gap-2">
        {status}
        <Button
          variant="ghost"
          size="sm"
          disabled={sending}
          onClick={() => submit(onUnsave, false)}
        >
          {t("unsave")}
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      className={BOX}
      disabled={sending || disabled}
      onClick={() => submit(onSave, true)}
    >
      <IconTitleSub
        icon={<Mail className="size-5" aria-hidden />}
        disc="bg-white/20"
        title={t("notifyTitle")}
        sub={t(OFFER_SUB[offer])}
      />
    </Button>
  );
}
