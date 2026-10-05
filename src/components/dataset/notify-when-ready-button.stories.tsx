import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { NotifyWhenReadyButton } from "./notify-when-ready-button";

const meta = {
  title: "Dataset/NotifyWhenReadyButton",
  component: NotifyWhenReadyButton,
  parameters: { layout: "centered" },
} satisfies Meta<typeof NotifyWhenReadyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { onSubscribe: fn() },
};

/** One press, no undo — and the confirmation never shows the address. */
export const Subscribing: Story = {
  args: { onSubscribe: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(args.onSubscribe).toHaveBeenCalled();
    await expect(
      await canvas.findByText("Saved. You'll get an email when the map is ready")
    ).toBeInTheDocument();
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};

/** Asked for on an earlier visit, so the page opens already confirmed. */
export const AlreadySubscribed: Story = {
  args: { subscribed: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Saved. You'll get an email when the map is ready"
    );
  },
};

/** A too-large dataset may never build, so the offer says "if". */
export const IfAvailable: Story = {
  args: { offer: "available", onSubscribe: fn() },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", {
        name: "Save and email me if it becomes available",
      })
    ).toBeInTheDocument();
  },
};

/** An empty dataset may stay empty forever, so this offer says "if" too. */
export const IfMapped: Story = {
  args: { offer: "mapped", onSubscribe: fn() },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Save and email me if it gets mapped" })
    ).toBeInTheDocument();
  },
};

/** A failed request leaves the button pressable rather than stranding it. */
export const SubscribeFails: Story = {
  args: {
    onSubscribe: fn(() => {
      throw new Error("no backend yet");
    }),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(canvas.getByRole("button")).toBeEnabled();
  },
};
