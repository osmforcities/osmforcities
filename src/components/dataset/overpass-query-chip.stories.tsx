import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { OverpassQueryChip } from "./overpass-query-chip";

const query = `[out:json][timeout:25];
rel(5400890);
map_to_area -> .searchArea;
(
  nwr["amenity"="bicycle_rental"](area.searchArea);
);
out geom meta;`;

const meta: Meta<typeof OverpassQueryChip> = {
  title: "Dataset/OverpassQueryChip",
  component: OverpassQueryChip,
  parameters: { layout: "padded" },
  args: { query },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Query" })).toBeVisible();
    await expect(
      within(document.body).queryByRole("dialog")
    ).not.toBeInTheDocument();
  },
};

function stubClipboard(writeText: (text: string) => Promise<void>) {
  return () => {
    const real = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    return () => {
      if (real) Object.defineProperty(navigator, "clipboard", real);
      else delete (navigator as { clipboard?: unknown }).clipboard;
    };
  };
}

const writeText = fn().mockResolvedValue(undefined);

export const RevealAndCopy: Story = {
  beforeEach: stubClipboard(writeText),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Query" }));
    const dialog = within(document.body).getByRole("dialog", {
      name: "Overpass query",
    });
    await expect(dialog).toHaveTextContent("rel(5400890);");

    const turbo = within(dialog).getByRole("link", {
      name: /Open in Overpass Turbo/,
    });
    await expect(turbo).toHaveAttribute(
      "href",
      `https://overpass-turbo.eu/?Q=${encodeURIComponent(query)}`
    );

    await userEvent.click(within(dialog).getByRole("button", { name: "Copy" }));
    await expect(writeText).toHaveBeenCalledWith(query);
    await expect(
      within(dialog).getByRole("button", { name: "Copied" })
    ).toBeVisible();
  },
};

export const CopyFails: Story = {
  beforeEach: stubClipboard(() => Promise.reject(new Error("denied"))),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Query" }));
    const dialog = within(document.body).getByRole("dialog", {
      name: "Overpass query",
    });
    await userEvent.click(within(dialog).getByRole("button", { name: "Copy" }));
    await expect(
      within(dialog).getByRole("button", { name: "Copy failed" })
    ).toBeVisible();
  },
};
