import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
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
    await userEvent.click(canvas.getByRole("button", { name: "Search areas" }));
    await expect(canvas.getByRole("combobox", { name: "Search areas" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    await expect(canvas.getByRole("button", { name: "Search areas" })).toHaveFocus();

    await userEvent.click(canvas.getByRole("button", { name: "Search areas" }));
    await userEvent.click(canvas.getByRole("button", { name: "Clear search" }));
    await expect(canvas.getByRole("button", { name: "Search areas" })).toHaveFocus();
  },
};

/** A failed request says so, without the "pick an area first" hint meant for no matches. */
export const SearchFailed: Story = {
  beforeEach: () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    return () => {
      globalThis.fetch = realFetch;
    };
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Search areas" }));
    await userEvent.keyboard("paris");
    const body = within(canvasElement.ownerDocument.body);
    await expect(
      await body.findByText("Search failed, please try again.", { selector: "p" }, { timeout: 8000 })
    ).toBeVisible();
    await expect(body.queryByText("Pick an area first, then search its datasets.")).toBeNull();
  },
};
