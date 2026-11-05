import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent } from "storybook/test";
import type { AreaTemplate } from "@/lib/area-templates";
import { AreaBrowse } from "./area-browse";
import { AreaFlag } from "./area-facts";

const template = (
  id: string,
  name: string,
  categorySlug: string,
  topicSlug: string
): AreaTemplate => ({
  id,
  name,
  description: null,
  categorySlug,
  topicSlug,
  commonRank: null,
  englishName: name,
  osmTags: [],
});

const templates = [
  template("bus-stops", "Bus stops", "bus", "mobility"),
  template("bicycle-parking", "Bicycle parking", "cycling", "mobility"),
  template("cafes", "Cafés", "food", "food-drink"),
  template("clinics", "Clinics", "health", "health"),
];

const meta = {
  title: "Area/Browse",
  component: AreaBrowse,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  args: {
    areaId: "42",
    areaName: "São Paulo",
    parentBreadcrumb: [{ label: "Brazil" }],
    templates,
    children: <p>{"Page content"}</p>,
  },
} satisfies Meta<typeof AreaBrowse>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Results replace the pickers and the page until the search is cleared. */
export const Searching: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByRole("searchbox", { name: "Search datasets in São Paulo" });
    await userEvent.type(field, "bicycle");
    await expect(canvas.getByRole("heading", { name: '1 result for "bicycle"' })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Bicycle parking" })).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Pick a topic" })).toBeNull();
    await expect(canvas.queryByText("Page content")).toBeNull();

    await userEvent.keyboard("{Escape}");
    await expect(field).toHaveValue("");
    await expect(canvas.getByRole("heading", { name: "Pick a topic" })).toBeVisible();
    await expect(canvas.getByText("Page content")).toBeVisible();
  },
};

/** No match: say so and offer a way back. */
export const NoResults: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("searchbox"), "zzzz");
    await expect(canvas.getByRole("heading", { name: 'No datasets match "zzzz"' })).toBeVisible();
    const [, emptyStateClear] = canvas.getAllByRole("button", { name: "Clear search" });
    await userEvent.click(emptyStateClear);
    await expect(canvas.getByRole("searchbox")).toHaveValue("");
    await expect(canvas.getByText("Page content")).toBeVisible();
  },
};

/** A shared link with ?q= opens straight on the results. */
export const FromSharedLink: Story = {
  parameters: { nextjs: { navigation: { query: { q: "bus" } } } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("searchbox")).toHaveValue("bus");
    await expect(canvas.getByRole("link", { name: "Bus stops" })).toBeVisible();
  },
};

/** The flag sits right of the title, facts and links, as tall as that block. */
export const WithFlag: Story = {
  args: { flag: <AreaFlag commonsFile="Bandeira da cidade de São Paulo.svg" /> },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("area-flag")).toHaveAttribute(
      "src",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Bandeira%20da%20cidade%20de%20S%C3%A3o%20Paulo.svg?width=320"
    );
  },
};
