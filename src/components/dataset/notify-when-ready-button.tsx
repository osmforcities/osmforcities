"use client";

import { useState } from "react";
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
   * an empty one only if someone maps it), so their offers say "if".
   */
  offer?: keyof typeof OFFER_KEY;
};

// The offers run long in German and French; on a phone the button wraps
// inside the card instead of overflowing it.
const WRAP = "max-w-full whitespace-normal text-center";

const OFFER_KEY = {
  ready: "notifyCta",
  available: "notifyCtaIfAvailable",
  mapped: "notifyCtaIfMapped",
} as const;

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
          WRAP,
          "pointer-events-none cursor-default border-olive-300 bg-olive-50 text-olive-700"
        )}
      >
        <Check aria-hidden />
        {t(notifying ? "notifyConfirmed" : "savedConfirmed")}
      </p>
    );
    if (!onUnsave) return status;
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
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
      variant="outline"
      size="sm"
      className={WRAP}
      disabled={sending}
      onClick={() => submit(onSave, true)}
    >
      <Mail aria-hidden />
      {t(OFFER_KEY[offer])}
    </Button>
  );
}
