import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { FeatureDetailPanel } from "./feature-detail-panel";
import type { Feature } from "geojson";

const bicycleParkingFeature: Feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [-46.63, -23.55] },
  properties: {
    "@type": "node",
    "@id": "123456",
    name: "Bicycle Parking Central",
    bicycle_parking: "stands",
    capacity: "12",
    covered: "yes",
    access: "yes",
  },
};

const noNameFeature: Feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [-46.63, -23.55] },
  properties: {
    "@type": "node",
    "@id": "789012",
    bicycle_parking: "wall_loops",
    capacity: "6",
  },
};

const noOsmIdFeature: Feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [-46.63, -23.55] },
  properties: {
    name: "Some Feature",
    bicycle_parking: "stands",
  },
};

const meta: Meta<typeof FeatureDetailPanel> = {
  title: "Dataset/FeatureDetailPanel",
  component: FeatureDetailPanel,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    feature: bicycleParkingFeature,
    activeField: "bicycle_parking",
    onBack: fn(),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Bicycle Parking Central" })
    ).toBeInTheDocument();
    await expect(canvas.getAllByText("bicycle_parking").length).toBeGreaterThan(0);
    await expect(
      canvas.getByRole("link", { name: /Open in OpenStreetMap/i })
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: /Back/i })
    ).toBeInTheDocument();
  },
};

export const NoName: Story = {
  args: {
    feature: noNameFeature,
    activeField: "bicycle_parking",
    onBack: fn(),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole("heading")
    ).not.toBeInTheDocument();
    await expect(canvas.getByText("wall_loops")).toBeInTheDocument();
  },
};

export const NoOsmId: Story = {
  args: {
    feature: noOsmIdFeature,
    onBack: fn(),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole("link", { name: /Open in OpenStreetMap/i })
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("heading", { name: "Some Feature" })
    ).toBeInTheDocument();
  },
};

export const OnBackClick: Story = {
  args: {
    feature: bicycleParkingFeature,
    activeField: "bicycle_parking",
    onBack: fn(),
  },
  play: async ({ canvas, args, userEvent }) => {
    const backButton = canvas.getByRole("button", { name: /Back/i });
    await userEvent.click(backButton);
    await expect(args.onBack).toHaveBeenCalled();
  },
};
