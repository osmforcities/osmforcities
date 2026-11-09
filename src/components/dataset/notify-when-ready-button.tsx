"use client";

import { useState, type ReactNode } from "react";
import { BookmarkCheck, Check, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

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

// The map page's Save button in size and place. The label says what saving
// does here (the email), so it is a floor, not a fixed height: it may wrap.
const SAVE = "h-auto min-h-8 w-full py-1.5 text-sm whitespace-normal";

// "e-mail" must not split at its hyphen. Scoped to that word so other hyphens
// a translation adds still wrap.
const keepEmailWhole = (text: string) =>
  text.replace(/\b(e)-(mail)/gi, "$1\u2011$2");

const OFFER_SUB = {
  ready: "notifySub",
  available: "notifySubIfAvailable",
  mapped: "notifySubIfMapped",
} as const;

function IconLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <>
      {icon}
      <span className="min-w-0">{keepEmailWhole(label)}</span>
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
    return (
      <div className="flex w-full flex-col gap-2">
        <p
          role="status"
          className="flex items-start justify-center gap-2 text-sm text-olive-700 [&_svg]:mt-0.5"
        >
          <IconLabel
            icon={<Check className="size-4 shrink-0" aria-hidden />}
            label={notifying ? t("notifyConfirmedSub") : t("savedTitle")}
          />
        </p>
        {onUnsave && (
          <Button
            variant="outline"
            className={SAVE}
            disabled={sending}
            onClick={() => submit(onUnsave, false)}
          >
            <BookmarkCheck className="h-4 w-4" />
            {t("unsave")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      className={SAVE}
      disabled={sending || disabled}
      onClick={() => submit(onSave, true)}
    >
      <IconLabel
        icon={<Mail className="size-4 shrink-0" aria-hidden />}
        label={t(OFFER_SUB[offer])}
      />
    </Button>
  );
}
