"use client";

import { useState } from "react";
import { Check, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotifyWhenReadyButtonProps = {
  /** Records the request. Omitted until the notification backend exists. */
  onSubscribe?: () => Promise<void> | void;
  /** Already asked for on an earlier visit. */
  subscribed?: boolean;
  /**
   * What the email is conditional on. "ready" is a bake in flight. The other
   * two may never happen (a too-large dataset builds only if the data shrinks,
   * an empty one only if someone maps it), so their offers say "if".
   */
  offer?: keyof typeof OFFER_KEY;
};

const OFFER_KEY = {
  ready: "notifyCta",
  available: "notifyCtaIfAvailable",
  mapped: "notifyCtaIfMapped",
} as const;

/**
 * Saving a dataset is what keeps it on the retry schedule and what carries the
 * one-shot email, so the button does both in one press. There is no undo here
 * (unsaving is the undo) and the address is never shown, so the page stays
 * safe to read over someone's shoulder.
 */
export function NotifyWhenReadyButton({
  onSubscribe,
  subscribed = false,
  offer = "ready",
}: NotifyWhenReadyButtonProps) {
  const t = useTranslations("DatasetPage");
  const [confirmed, setConfirmed] = useState(subscribed);
  const [sending, setSending] = useState(false);

  if (confirmed) {
    // Same box as the button it replaces, so the panel keeps its height and
    // the confirmation lands exactly where the press happened.
    return (
      <p
        role="status"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "pointer-events-none cursor-default border-olive-300 bg-olive-50 text-olive-700"
        )}
      >
        <Check aria-hidden />
        {t("notifyConfirmed")}
      </p>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={sending}
      onClick={async () => {
        setSending(true);
        try {
          await onSubscribe?.();
          setConfirmed(true);
        } catch {
          // Leave the button idle so it can simply be pressed again; wording
          // for a failed request belongs with the backend that can explain it.
        } finally {
          setSending(false);
        }
      }}
    >
      <Mail aria-hidden />
      {t(OFFER_KEY[offer])}
    </Button>
  );
}
