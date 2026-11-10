import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { FeatureDetailPanel } from "./feature-detail-panel";
import type { Feature } from "geojson";

const bicycleParkingFeature: Feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [-46.63, -23.55] },
  properties: {
    id: "node/123456",
    name: "Bicycle Parking Central",
    bicycle_parking: "stands",
    capacity: "12",
    covered: "yes",
    access: "yes",
    user: "johndoe",
    uid: 789,
    timestamp: "2024-06-15T10:30:00Z",
    version: 3,
    changeset: 456789,
    _ts: 1718447400,
  },
};

const TILE_TS = 1781524800;

// Archives keep no editor metadata; selection copies "@id" onto "id"
const tileFeature: Feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [4.9, 52.37] },
  properties: {
    id: "node/1",
    "@id": "node/1",
    amenity: "bench",
    _ts: TILE_TS,
  },
};

const memberNodeFeature: Feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [4.9, 52.37] },
  properties: { id: "node/2", "@id": "node/2", _ts: 0 },
};

const noNameFeature: Feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [-46.63, -23.55] },
  properties: {
    id: "node/789012",
    bicycle_parking: "wall_loops",
    capacity: "6",
    _ts: 1718447400,
  },
};

const noOsmIdFeature: Feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [-46.63, -23.55] },
  properties: {
    name: "Some Feature",
    bicycle_parking: "stands",
    _ts: 1718447400,
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
    // metadata: user shown, uid hidden
    await expect(canvas.getByRole("link", { name: "johndoe" })).toBeInTheDocument();
    await expect(canvas.queryByText("789")).not.toBeInTheDocument();
  },
};

export const NoName: Story = {
  args: {
    feature: noNameFeature,
    onBack: fn(),
  },
  play: async ({ canvas }) => {
    // No name tag — fallback heading shows capitalized OSM type and ID
    await expect(canvas.getByRole("heading", { name: "Node 789012" })).toBeInTheDocument();
    await expect(canvas.getByText("wall_loops")).toBeInTheDocument();
    await expect(canvas.queryByText(/Last edited by/i)).not.toBeInTheDocument();
  },
};

export const FromTile: Story = {
  args: {
    feature: tileFeature,
    onBack: fn(),
  },
  play: async ({ canvas }) => {
    const editedOn = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(TILE_TS * 1000));
    await expect(
      canvas.getByText(`Last edited ${editedOn}`)
    ).toBeInTheDocument();
    await expect(canvas.queryByText(/Last edited by/i)).not.toBeInTheDocument();
    await expect(canvas.getByText("bench")).toBeInTheDocument();
  },
};

export const MemberNode: Story = {
  args: {
    feature: memberNodeFeature,
    onBack: fn(),
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Last edited/i)).not.toBeInTheDocument();
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
    onBack: fn(),
  },
  play: async ({ canvas, args, userEvent }) => {
    const backButton = canvas.getByRole("button", { name: /Back/i });
    await userEvent.click(backButton);
    await expect(args.onBack).toHaveBeenCalled();
  },
};
