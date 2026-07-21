import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import {
  InteractiveLegend,
  type LegendCategory,
  type LegendViewOption,
} from "./interactive-legend";
import { AGE_COLORS } from "./layers/map-style";
import { PALETTES } from "@/lib/map-palettes";
import { OTHER_CATEGORY, MISSING_CATEGORY } from "@/lib/curated-themes";

const ageView: LegendViewOption = { id: "age", label: "Last Edited" };
const surfaceView: LegendViewOption = { id: "surface", label: "surface" };

const ageCategories: LegendCategory[] = [
  { id: "recent", label: "≤ 7 days ago", color: AGE_COLORS.recent, count: 12 },
  { id: "medium", label: "8-30 days ago", color: AGE_COLORS.medium, count: 45 },
  { id: "older", label: "31-90 days ago", color: AGE_COLORS.older, count: 130 },
  {
    id: "very-old",
    label: "> 90 days ago",
    color: AGE_COLORS["very-old"],
    count: 2418,
  },
];

const surfaceCategories: LegendCategory[] = [
  { id: "asphalt", label: "asphalt", color: PALETTES.categorical.tableau10[0], count: 820 },
  { id: "paving_stones", label: "paving_stones", color: PALETTES.categorical.tableau10[1], count: 240 },
  { id: "concrete", label: "concrete", color: PALETTES.categorical.tableau10[2], count: 96 },
  { id: "sand", label: "sand", color: PALETTES.categorical.tableau10[3], count: 12 },
  { id: OTHER_CATEGORY, label: "Other", color: PALETTES.categorical.other, count: 31 },
  { id: MISSING_CATEGORY, label: "Missing", color: PALETTES.categorical.missing, count: 1406, muted: true },
];

/** Stateful wrapper so toggles and view switches work in the story canvas. */
function LegendPlayground({
  views,
  categoriesByView,
  initialHidden = [],
}: {
  views: LegendViewOption[];
  categoriesByView: Record<string, LegendCategory[]>;
  initialHidden?: string[];
}) {
  const [activeViewId, setActiveViewId] = useState(views[0].id);
  const [hidden, setHidden] = useState(new Set(initialHidden));

  return (
    <InteractiveLegend
      views={views}
      activeViewId={activeViewId}
      categories={categoriesByView[activeViewId]}
      hiddenIds={hidden}
      onViewChange={(viewId) => {
        setActiveViewId(viewId);
        setHidden(new Set());
      }}
      onToggle={(id) =>
        setHidden((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        })
      }
    />
  );
}

const meta = {
  title: "Dataset/InteractiveLegend",
  component: InteractiveLegend,
  parameters: { layout: "centered" },
} satisfies Meta<typeof InteractiveLegend>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AgeView: Story = {
  args: {
    views: [ageView],
    activeViewId: "age",
    categories: ageCategories,
    hiddenIds: new Set<string>(),
    onViewChange: fn(),
    onToggle: fn(),
  },
};

export const TagViewWithOtherAndMissing: Story = {
  args: {
    views: [ageView, surfaceView],
    activeViewId: "surface",
    categories: surfaceCategories,
    hiddenIds: new Set<string>(),
    onViewChange: fn(),
    onToggle: fn(),
  },
};

export const SomeCategoriesHidden: Story = {
  args: {
    views: [ageView],
    activeViewId: "age",
    categories: ageCategories,
    hiddenIds: new Set(["older", "very-old"]),
    onViewChange: fn(),
    onToggle: fn(),
  },
};

export const AllHidden: Story = {
  args: {
    views: [ageView, surfaceView],
    activeViewId: "surface",
    categories: surfaceCategories,
    hiddenIds: new Set(surfaceCategories.map((c) => c.id)),
    onViewChange: fn(),
    onToggle: fn(),
  },
};

export const Interactive: Story = {
  args: {
    views: [ageView, surfaceView],
    activeViewId: "age",
    categories: ageCategories,
    hiddenIds: new Set<string>(),
    onViewChange: fn(),
    onToggle: fn(),
  },
  render: () => (
    <LegendPlayground
      views={[ageView, surfaceView]}
      categoriesByView={{ age: ageCategories, surface: surfaceCategories }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const recentRow = canvas.getByRole("checkbox", { name: /7 days ago/ });
    await expect(recentRow).toBeChecked();
    await userEvent.click(recentRow);
    await expect(recentRow).not.toBeChecked();

    const viewSelect = canvas.getByRole("combobox", { name: "Color by" });
    await userEvent.selectOptions(viewSelect, "surface");
    await expect(
      canvas.getByRole("checkbox", { name: /asphalt/ })
    ).toBeChecked();
  },
};
