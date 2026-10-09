import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import type { Dataset } from "@/schemas/dataset";
import messages from "../../../messages/en.json";
import { DatasetTimestamps } from "./dataset-timestamps";

const dataset = {
  id: "ds-1",
  stats: { mostRecentElement: "2026-09-01T10:00:00Z" },
} as unknown as Dataset;

const meta: Meta<typeof DatasetTimestamps> = {
  title: "Dataset/DatasetTimestamps",
  component: DatasetTimestamps,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const JustFetched: Story = {
  args: { dataset, lastChecked: new Date(Date.now() - 1000) },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /^Fetched \d+ seconds? ago$/ })
    ).toBeVisible();
  },
};

export const HydratesAfterTheClockMoves: Story = {
  args: JustFetched.args,
  play: async ({ args, canvasElement }) => {
    const tree = (
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <DatasetTimestamps {...args} />
      </NextIntlClientProvider>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    canvasElement.append(container);

    const realNow = Date.now;
    const later = realNow() + 5000;
    Date.now = () => later;
    const actEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    actEnv.IS_REACT_ACT_ENVIRONMENT = true;
    const errors: string[] = [];
    try {
      await act(async () => {
        hydrateRoot(container, tree, {
          onRecoverableError: (error) => errors.push(String(error)),
        });
      });
    } finally {
      Date.now = realNow;
      actEnv.IS_REACT_ACT_ENVIRONMENT = false;
    }

    await expect(errors).toEqual([]);
  },
};
