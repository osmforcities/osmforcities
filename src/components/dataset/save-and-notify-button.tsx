"use client";

import type { ComponentProps } from "react";
import { useDatasetActions } from "@/hooks/useDatasetActions";
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
  return (
    <NotifyWhenReadyButton
      saved={saved}
      notify={notify}
      offer={offer}
      // Throwing leaves the control as it was so it can be pressed again.
      onSave={async () => {
        const result = await saveDataset(datasetId, true);
        if (!result.success) throw new Error(result.error);
      }}
      onUnsave={async () => {
        const result = await unsaveDataset(datasetId);
        if (!result.success) throw new Error(result.error);
      }}
    />
  );
}
