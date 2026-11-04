import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, waitFor } from "storybook/test";
import { useState } from "react";
import { Select } from "./select";

const options = [
  { id: "DAILY", label: "Daily" },
  { id: "WEEKLY", label: "Weekly" },
];

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    a11y: { disable: false },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Frequency",
    options,
    value: "DAILY",
    onChange: fn(),
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: /Frequency/ });
    await expect(trigger).toHaveTextContent("Daily");
    await expect(canvas.getByText("Frequency")).toBeVisible();
  },
};

export const HiddenLabel: Story = {
  args: {
    label: "Language",
    hideLabel: true,
    options: [
      { id: "en", label: "English" },
      { id: "es", label: "Español" },
    ],
    value: "en",
    onChange: fn(),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /Language/ })
    ).toBeInTheDocument();
    await expect(canvas.getByText("Language")).toHaveClass("sr-only");
  },
};

export const Disabled: Story = {
  args: {
    label: "Frequency",
    options,
    value: "DAILY",
    onChange: fn(),
    isDisabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /Frequency/ })).toBeDisabled();
  },
};

export const KeyboardSelection: Story = {
  render: () => {
    const [value, setValue] = useState("DAILY");
    return (
      <Select
        label="Frequency"
        options={options}
        value={value}
        onChange={setValue}
      />
    );
  },
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: /Frequency/ });
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    const listbox = await screen.findByRole("listbox");
    await expect(listbox).toBeInTheDocument();
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(trigger).toHaveTextContent("Weekly"));
  },
};
