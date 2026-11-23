import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { SaveAndNotifyButton } from "./save-and-notify-button";

const meta = {
  title: "Dataset/SaveAndNotifyButton",
  component: SaveAndNotifyButton,
  parameters: { layout: "centered" },
  args: { datasetId: "ds-1", offer: "ready" },
} satisfies Meta<typeof SaveAndNotifyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

function answerSave(status: number, body: unknown) {
  return () => {
    const realFetch = window.fetch;
    window.fetch = async (...request: Parameters<typeof fetch>) => {
      const url = String(
        request[0] instanceof Request ? request[0].url : request[0]
      );
      if (!url.includes("/save")) return realFetch(...request);
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    };
    return () => {
      window.fetch = realFetch;
    };
  };
}

/** The cron deleted the row while the page was open: the refresh recreates it. */
export const DatasetGone: Story = {
  beforeEach: answerSave(404, { error: "Dataset not found" }),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await waitFor(() => expect(getRouter().refresh).toHaveBeenCalled());
  },
};

/** Any other failure leaves the button to press again, with no refresh. */
export const SaveFails: Story = {
  beforeEach: answerSave(500, { error: "boom" }),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(await canvas.findByRole("button")).toBeEnabled();
    await expect(getRouter().refresh).not.toHaveBeenCalled();
  },
};
