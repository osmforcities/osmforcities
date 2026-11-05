import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import type { Dataset } from "@/schemas/dataset";
import { ChildTemplateLinks, ParentTemplateLink } from "./template-hierarchy-links";

const LISBON = 5400890;

const datasetWith = (template: Partial<Dataset["template"]>) =>
  ({
    area: { id: LISBON },
    template: { parent: null, children: [], ...template },
  }) as unknown as Dataset;

function SidePanel({ dataset }: { dataset: Dataset }) {
  return (
    <div className="w-96 bg-gray-50 p-4">
      <ParentTemplateLink dataset={dataset} />
      <ChildTemplateLinks dataset={dataset} />
    </div>
  );
}

const meta: Meta<typeof SidePanel> = {
  title: "Dataset/TemplateHierarchyLinks",
  component: SidePanel,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ChildDataset: Story = {
  args: {
    dataset: datasetWith({
      parent: { id: "public-transit", name: "Public transit" },
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/^Part of/)).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Public transit" })).toHaveAttribute(
      "href",
      `/en/area/${LISBON}/dataset/public-transit`
    );
    await expect(canvas.queryByText("More specific")).toBeNull();
  },
};

export const ParentDataset: Story = {
  args: {
    dataset: datasetWith({
      children: [
        { id: "bus-stops", name: "Bus stops" },
        { id: "tram-stops", name: "Tram stops" },
      ],
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "More specific" })).toBeVisible();
    const links = canvas.getAllByRole("link");
    await expect(links.map((link) => link.textContent)).toEqual(["Bus stops", "Tram stops"]);
    await expect(links[1]).toHaveAttribute("href", `/en/area/${LISBON}/dataset/tram-stops`);
    await expect(canvas.queryByText(/^Part of/)).toBeNull();
  },
};

export const StandaloneDataset: Story = {
  args: { dataset: datasetWith({}) },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/^Part of/)).toBeNull();
    await expect(canvas.queryByText("More specific")).toBeNull();
  },
};
