import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { SaveAndNotifyButton } from "./save-and-notify-button";
import { serveRoute } from "../../../.storybook/serve-route";

const meta = {
  title: "Dataset/SaveAndNotifyButton",
  component: SaveAndNotifyButton,
  parameters: { layout: "centered" },
  args: { datasetId: "ds-1", offer: "ready" },
} satisfies Meta<typeof SaveAndNotifyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The cron deleted the row while the page was open: the refresh recreates it. */
export const DatasetGone: Story = {
  beforeEach: serveRoute("/save", () => ({ error: "Dataset not found" }), 404),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await waitFor(() => expect(getRouter().refresh).toHaveBeenCalled());
    await expect(await canvas.findByRole("button")).toBeEnabled();
    await expect(canvas.queryByRole("status")).not.toBeInTheDocument();
  },
};

/** Any other failure leaves the button to press again, with no refresh. */
export const SaveFails: Story = {
  beforeEach: serveRoute("/save", () => ({ error: "boom" }), 500),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(await canvas.findByRole("button")).toBeEnabled();
    await expect(getRouter().refresh).not.toHaveBeenCalled();
  },
};
