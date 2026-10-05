import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor } from "storybook/test";
import type { Dataset } from "@/schemas/dataset";
import { DatasetActionsSection } from "./dataset-actions-section";

const dataset: Dataset = {
  id: "ds-1",
  cityName: "Berlin",
  isActive: true,
  lastChecked: new Date("2026-10-05T10:00:00Z"),
  tilesState: "done",
  dataCount: 120,
  stats: null,
  createdAt: new Date("2026-09-01T10:00:00Z"),
  updatedAt: new Date("2026-10-05T10:00:00Z"),
  geojson: null,
  bbox: null,
  template: {
    id: "tpl-1",
    name: "Schools",
    category: null,
    description: null,
  },
  user: null,
  area: {
    id: 1,
    name: "Berlin",
    countryCode: "DE",
    bounds: null,
    geojson: null,
  },
  canRefresh: true,
};

const meta: Meta<typeof DatasetActionsSection> = {
  title: "Dataset/DatasetActionsSection",
  component: DatasetActionsSection,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const SyncEnabled: Story = {
  args: { dataset },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /Sync/ })).toBeEnabled();
  },
};

export const SyncQueuesRebuild: Story = {
  args: { dataset, onRefreshed: fn() },
  beforeEach: () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      Response.json({
        success: true,
        lastChecked: "2026-10-05T12:00:00Z",
        tilesState: "pending",
      });
    return () => {
      globalThis.fetch = realFetch;
    };
  },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Sync/ }));
    await waitFor(() =>
      expect(canvas.getByText("Update queued")).toBeInTheDocument()
    );
    await expect(
      canvas.getByRole("button", { name: /Updating/ })
    ).toBeDisabled();
    await expect(args.onRefreshed).not.toHaveBeenCalled();
  },
};

export const SyncWhileBakePending: Story = {
  args: { dataset: { ...dataset, tilesState: "pending" } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /Updating/ })
    ).toBeDisabled();
  },
};
