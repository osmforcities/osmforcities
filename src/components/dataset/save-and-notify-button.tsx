"use client";

import type { ComponentProps } from "react";
import { useDatasetActions } from "@/hooks/useDatasetActions";
import { useRouter } from "@/i18n/navigation";
import { NotifyWhenReadyButton } from "./notify-when-ready-button";

export function SaveAndNotifyButton({
  datasetId,
  saved,
  notify,
  offer,
}: { datasetId: string } & Omit<
  ComponentProps<typeof NotifyWhenReadyButton>,
  "onSave" | "onUnsave"
>) {
  const { saveDataset, unsaveDataset } = useDatasetActions();
  const router = useRouter();
  return (
    <NotifyWhenReadyButton
      saved={saved}
      notify={notify}
      offer={offer}
      // Throwing leaves the control as it was so it can be pressed again.
      onSave={async () => {
        const result = await saveDataset(datasetId, true);
        // The cron deleted the row: the refresh recreates it
        if (result.status === 404) return router.refresh();
        if (!result.success) throw new Error(result.error);
      }}
      onUnsave={async () => {
        const result = await unsaveDataset(datasetId);
        if (!result.success) throw new Error(result.error);
      }}
    />
  );
}
