import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
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

const aSecondAgo = () => new Date(Date.now() - 1000);

export const JustFetched: Story = {
  args: { dataset },
  render: (args) => <DatasetTimestamps {...args} lastChecked={aSecondAgo()} />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /^Fetched \d+ seconds? ago$/ })
    ).toBeVisible();
  },
};

export const HydratesAfterTheClockMoves: Story = {
  args: { dataset },
  render: () => <></>,
  play: async ({ args, canvasElement }) => {
    const tree = (
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <DatasetTimestamps {...args} lastChecked={aSecondAgo()} />
      </NextIntlClientProvider>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    canvasElement.append(container);

    const realNow = Date.now;
    const later = realNow() + 5000;
    Date.now = () => later;
    const actEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const priorActEnv = actEnv.IS_REACT_ACT_ENVIRONMENT;
    actEnv.IS_REACT_ACT_ENVIRONMENT = true;
    const errors: string[] = [];
    let root: Root | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, tree, {
          onRecoverableError: (error) => errors.push(String(error)),
        });
      });
    } finally {
      Date.now = realNow;
      await act(async () => root?.unmount());
      container.remove();
      actEnv.IS_REACT_ACT_ENVIRONMENT = priorActEnv;
    }

    await expect(errors).toEqual([]);
  },
};
