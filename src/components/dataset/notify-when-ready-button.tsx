"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SAVE_HINT_SLOT_ID } from "@/components/ui/dataset-no-map-page";
import { Bookmark, BookmarkCheck, Check, Mail } from "lucide-react";
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

// The map page's Save button, so the control does not change when the map lands.
const SAVE = "h-8 w-full text-sm";
// What saving does here: one centred line under the status.
const HINT = "flex items-start justify-center gap-2 text-sm [&_svg]:mt-0.5";

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
  const hintId = useId();
  // On the no-map page the hint belongs with the status, away from this
  // button, so it is placed in the page's slot. Standing alone it stays here.
  // ponytail: placed after mount, so it appears a beat late. Lift the saved
  // state into the page if that shows.
  const [hintSlot, setHintSlot] = useState<Element | null>();
  useEffect(() => {
    setHintSlot(document.getElementById(SAVE_HINT_SLOT_ID));
  }, []);
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

  const hint = confirmed ? (
    <p role="status" className={`${HINT} text-olive-700`}>
      <IconLabel
        icon={<Check className="size-4 shrink-0" aria-hidden />}
        label={notifying ? t("notifyConfirmedSub") : t("savedTitle")}
      />
    </p>
  ) : (
    <p id={hintId} className={`${HINT} text-gray-600`}>
      <IconLabel
        icon={<Mail className="size-4 shrink-0" aria-hidden />}
        label={t(OFFER_SUB[offer])}
      />
    </p>
  );

  return (
    <div className="flex w-full flex-col gap-2">
      {/* Unknown until mounted, so the hint never shows in the wrong place. */}
      {hintSlot === undefined
        ? null
        : hintSlot
          ? createPortal(hint, hintSlot)
          : hint}
      {confirmed ? (
        onUnsave && (
          <Button
            variant="outline"
            className={SAVE}
            disabled={sending}
            onClick={() => submit(onUnsave, false)}
          >
            <BookmarkCheck className="h-4 w-4" />
            {t("unsave")}
          </Button>
        )
      ) : (
        // Named by its own label plus the hint, so "Save" alone never hides
        // that this press also asks for the email.
        <Button
          id={`${hintId}-save`}
          className={SAVE}
          aria-labelledby={`${hintId}-save ${hintId}`}
          disabled={sending || disabled}
          onClick={() => submit(onSave, true)}
        >
          <Bookmark className="h-4 w-4" />
          {t("save")}
        </Button>
      )}
    </div>
  );
}
