import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent } from "storybook/test";
import NavSearch from "./nav-search";

const meta = {
  title: "Navigation/NavSearch",
  component: NavSearch,
  parameters: { a11y: { test: "error" } },
  decorators: [
    (Story) => (
      <div className="relative flex h-16 items-center justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NavSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on press; Escape and x both collapse it and return focus to the button. */
export const OpenAndClose: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Search an area" }));
    await expect(canvas.getByRole("combobox", { name: "Search an area" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    await expect(canvas.getByRole("button", { name: "Search an area" })).toHaveFocus();

    await userEvent.click(canvas.getByRole("button", { name: "Search an area" }));
    await userEvent.click(canvas.getByRole("button", { name: "Clear search" }));
    await expect(canvas.getByRole("button", { name: "Search an area" })).toHaveFocus();
  },
};
