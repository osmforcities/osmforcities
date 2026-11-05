import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { CompactLegend } from "./compact-legend";
import { AGE_COLORS } from "./layers/map-style";
import { PALETTES } from "@/lib/map-palettes";
import { OTHER_CATEGORY, MISSING_CATEGORY } from "@/lib/curated-themes";

const meta = {
  title: "Dataset/CompactLegend",
  component: CompactLegend,
  parameters: { layout: "centered" },
} satisfies Meta<typeof CompactLegend>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AgeView: Story = {
  args: {
    title: "Last Edited",
    rows: [
      { id: "recent", label: "≤ 7 days ago", color: AGE_COLORS.recent },
      { id: "medium", label: "8-30 days ago", color: AGE_COLORS.medium },
      { id: "older", label: "31-90 days ago", color: AGE_COLORS.older },
      { id: "very-old", label: "> 90 days ago", color: AGE_COLORS["very-old"] },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Last Edited")).toBeVisible();
    await expect(canvas.getByText("> 90 days ago")).toBeVisible();
  },
};

export const TagViewWithOtherAndMissing: Story = {
  args: {
    title: "Building type",
    rows: [
      { id: "apartments", label: "apartments", color: PALETTES.categorical.tableau10[0] },
      { id: "house", label: "house", color: PALETTES.categorical.tableau10[1] },
      { id: OTHER_CATEGORY, label: "Other", color: PALETTES.categorical.other },
      { id: MISSING_CATEGORY, label: "Missing", color: PALETTES.categorical.missing },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Building type")).toBeVisible();
    await expect(canvas.getByText("apartments")).toBeVisible();
    await expect(canvas.getByText("Missing")).toBeVisible();
    await expect(canvas.queryByText("Last Edited")).toBeNull();
  },
};
