import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import type { AreaTemplate } from "@/lib/area-templates";
import { CategoryNav } from "./category-nav";
import { TopicNav } from "./topic-nav";

const template = (id: string, categorySlug: string, topicSlug: string): AreaTemplate => ({
  id,
  name: id,
  description: null,
  categorySlug,
  topicSlug,
  commonRank: null,
});

const templates = [
  template("bus-stops", "bus", "mobility"),
  template("busways", "bus", "mobility"),
  template("cycleways", "cycling", "mobility"),
  template("parking", "mobility", "mobility"),
  template("clinics", "health", "health"),
  template("schools", "education", "education-culture"),
];

const meta = {
  title: "Area/Pickers",
  component: TopicNav,
  parameters: { layout: "padded", a11y: { test: "error" } },
  args: { templates, areaId: "42" },
} satisfies Meta<typeof TopicNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The hub: every topic as a tile, A to Z, with its dataset count. */
export const TopicsOpen: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Pick a topic" })).toBeInTheDocument();
    const links = canvas.getAllByRole("link");
    await expect(links.map((link) => link.textContent)).toEqual([
      "Education and culture1",
      "Health1",
      "Mobility4",
    ]);
    await expect(links[2]).toHaveAttribute("href", "/en/area/42/topics/mobility");
  },
};

/** A topic page: only the picked topic stays, and it leads back to the hub. */
export const TopicPicked: Story = {
  args: { activeTopicSlug: "mobility" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Topic" })).toBeInTheDocument();
    const chip = canvas.getByRole("link", { name: "Clear Mobility" });
    await expect(chip).toHaveAttribute("href", "/en/area/42");
    await expect(canvas.getAllByRole("link")).toHaveLength(1);
  },
};

/** Datasets filed directly under the topic come last, as "Other". */
export const CategoriesOpen: Story = {
  render: (args) => <CategoryNav {...args} topicSlug="mobility" />,
  play: async ({ canvas }) => {
    const links = canvas.getAllByRole("link");
    await expect(links.map((link) => link.textContent)).toEqual(["Bus2", "Cycling1", "Other1"]);
    await expect(links[1]).toHaveAttribute("href", "/en/area/42/topics/mobility/cycling");
  },
};

/** A category page: the chip leads back to the whole topic. */
export const CategoryPicked: Story = {
  render: (args) => <CategoryNav {...args} topicSlug="mobility" activeCategorySlug="cycling" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Category" })).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "Clear Cycling" })).toHaveAttribute(
      "href",
      "/en/area/42/topics/mobility"
    );
  },
};

/** One category would make picking pointless, so the picker stays hidden. */
export const SingleCategoryHidden: Story = {
  render: (args) => <CategoryNav {...args} topicSlug="health" />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toBeEmptyDOMElement();
  },
};
