import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import type { Dataset } from "@/schemas/dataset";
import { DatasetInfoPanel } from "./dataset-info-panel";

const withTemplate = (template: { name: string; description: string | null }) =>
  ({ id: "ds-1", isFeatured: false, template }) as unknown as Dataset;

const meta: Meta<typeof DatasetInfoPanel> = {
  title: "Dataset/DatasetInfoPanel",
  component: DatasetInfoPanel,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDescription: Story = {
  args: {
    dataset: withTemplate({
      name: "Bicycle parking",
      description: "Racks, stands and shelters for parking bicycles",
    }),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByTestId("dataset-template-description")
    ).toHaveTextContent("Racks, stands and shelters for parking bicycles");
  },
};

export const DescriptionEqualsName: Story = {
  args: {
    dataset: withTemplate({ name: "Playgrounds", description: "Playgrounds" }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByTestId("dataset-template-description")).toBeNull();
  },
};

export const NoDescription: Story = {
  args: { dataset: withTemplate({ name: "Playgrounds", description: null }) },
  play: async ({ canvas }) => {
    await expect(canvas.queryByTestId("dataset-template-description")).toBeNull();
  },
};
