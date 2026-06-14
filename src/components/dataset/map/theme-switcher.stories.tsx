import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { useState } from "react";
import { ThemeSwitcher } from "./theme-switcher";
import type { CategoricalTheme } from "@/lib/map-themes";

function StatefulThemeSwitcher({
  detectedThemes,
  initialTheme,
  onChange,
}: {
  detectedThemes: CategoricalTheme[];
  initialTheme: CategoricalTheme | null;
  onChange: (theme: CategoricalTheme | null) => void;
}) {
  const [active, setActive] = useState<CategoricalTheme | null>(initialTheme);
  return (
    <ThemeSwitcher
      detectedThemes={detectedThemes}
      activeTheme={active}
      onChange={(theme) => {
        setActive(theme);
        onChange(theme);
      }}
    />
  );
}

const bicycleParkingTheme: CategoricalTheme = {
  type: "categorical",
  field: "bicycle_parking",
  colorMap: new Map([
    ["stands", "#0b4ad8"],
    ["wall_loops", "#22c55e"],
    ["rack", "#f97316"],
  ]),
  topValues: [
    { value: "stands", count: 42 },
    { value: "wall_loops", count: 18 },
    { value: "rack", count: 9 },
  ],
  otherCount: 3,
};

const amenityTheme: CategoricalTheme = {
  type: "categorical",
  field: "amenity",
  colorMap: new Map([["bench", "#22c55e"]]),
  topValues: [{ value: "bench", count: 11 }],
  otherCount: 0,
};

const accessTheme: CategoricalTheme = {
  type: "categorical",
  field: "access",
  colorMap: new Map([["yes", "#0b4ad8"]]),
  topValues: [{ value: "yes", count: 30 }],
  otherCount: 0,
};

const meta: Meta<typeof ThemeSwitcher> = {
  title: "Dataset/Map/ThemeSwitcher",
  component: ThemeSwitcher,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const MultipleThemes: Story = {
  args: {
    detectedThemes: [bicycleParkingTheme, amenityTheme, accessTheme],
    activeTheme: bicycleParkingTheme,
    onChange: fn(),
  },
  render: (args) => (
    <StatefulThemeSwitcher
      detectedThemes={args.detectedThemes}
      initialTheme={args.activeTheme}
      onChange={args.onChange}
    />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Select map theme") as HTMLInputElement;
    expect(input.value).toBe("bicycle_parking");

    await userEvent.click(canvas.getByLabelText("Next theme"));
    expect(args.onChange).toHaveBeenLastCalledWith(amenityTheme);

    await userEvent.click(canvas.getByLabelText("Previous theme"));
    expect(args.onChange).toHaveBeenLastCalledWith(bicycleParkingTheme);
  },
};

export const SingleTheme: Story = {
  args: {
    detectedThemes: [bicycleParkingTheme],
    activeTheme: bicycleParkingTheme,
    onChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText("Next theme"));
    expect(args.onChange).toHaveBeenLastCalledWith(null);
  },
};

export const RecentEditsSelected: Story = {
  args: {
    detectedThemes: [bicycleParkingTheme, amenityTheme],
    activeTheme: null,
    onChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Select map theme") as HTMLInputElement;
    expect(input.value).toBe("Recent edits");
  },
};

export const NoDetectedThemes: Story = {
  args: {
    detectedThemes: [],
    activeTheme: null,
    onChange: fn(),
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.textContent ?? "").toBe("");
  },
};
