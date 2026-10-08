"use client";

import type { ComponentProps } from "react";
import { useDatasetActions } from "@/hooks/useDatasetActions";
import { NotifyWhenReadyButton } from "./notify-when-ready-button";

export function SaveAndNotifyButton({
  datasetId,
  saved,
  offer,
}: { datasetId: string } & Omit<
  ComponentProps<typeof NotifyWhenReadyButton>,
  "onSave"
>) {
  const { saveDataset } = useDatasetActions();
  return (
    <NotifyWhenReadyButton
      saved={saved}
      offer={offer}
      onSave={async () => {
        const result = await saveDataset(datasetId, true);
        // Throwing returns the button to idle so it can be pressed again.
        if (!result.success) throw new Error(result.error);
      }}
    />
  );
}
