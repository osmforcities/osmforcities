import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import type { AreaTemplate } from "@/lib/area-templates";
import { DatasetCards } from "./dataset-cards";

const template = (id: string, name: string, description: string | null): AreaTemplate => ({
  id,
  name,
  description,
  categorySlug: "bus",
  topicSlug: "mobility",
  commonRank: null,
  englishName: id,
  osmTags: [],
});

const meta = {
  title: "Area/DatasetCards",
  component: DatasetCards,
  parameters: { layout: "padded", a11y: { test: "error" } },
  args: {
    areaId: "42",
    templates: [
      template("bus-lanes", "Bus Lanes", "On-street exclusive bus lanes"),
      template("bus-stops", "Bus Stops", "Bus Stops"),
      template("busways", "Busways", null),
    ],
  },
} satisfies Meta<typeof DatasetCards>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A description that only repeats the name is hidden. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const cards = canvas.getAllByRole("link");
    await expect(cards[0]).toHaveAttribute("href", "/en/area/42/dataset/bus-lanes");
    await expect(cards[0]).toHaveTextContent("On-street exclusive bus lanes");
    await expect(cards[1]).toHaveTextContent(/^Bus Stops$/);
  },
};
