import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { ProgressBar } from "./progress-bar";

const meta = {
  title: "UI/ProgressBar",
  component: ProgressBar,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Work that reports a percentage. */
export const Determinate: Story = {
  args: { value: 62, label: "Building map tiles" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "62"
    );
  },
};

/** At zero a sliver still shows, so the bar reads as started rather than broken. */
export const JustStarted: Story = {
  args: { value: 0, label: "Building map tiles" },
};

export const Complete: Story = {
  args: { value: 100, label: "Building map tiles" },
};

/** No percentage to report — the fill sweeps back and forth instead. */
export const Indeterminate: Story = {
  args: { label: "Fetching data from OpenStreetMap" },
  play: async ({ canvas }) => {
    const bar = canvas.getByRole("progressbar");
    await expect(bar).not.toHaveAttribute("aria-valuenow");
    await expect(bar).toHaveAccessibleName("Fetching data from OpenStreetMap");
  },
};

/** Out-of-range input is clamped rather than overflowing the track. */
export const OutOfRange: Story = {
  args: { value: 140, label: "Building map tiles" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100"
    );
  },
};
