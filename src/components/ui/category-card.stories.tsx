import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Building2, HeartPulse } from "lucide-react";
import { CategoryCard } from "./category-card";

const meta: Meta<typeof CategoryCard> = {
  title: "UI/CategoryCard",
  component: CategoryCard,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof CategoryCard>;

export const Default: Story = {
  args: {
    icon: Building2,
    category: "Urban Planning",
    title: "Urban Planners",
    description:
      "Access structured city data to support planning decisions and infrastructure projects.",
  },
};

export const Showcase: Story = {
  args: {
    icon: HeartPulse,
    category: "Healthcare",
    title: "Healthcare Facilities",
    description:
      "Hospitals, clinics, pharmacies and emergency services mapped for your city.",
    variant: "showcase",
  },
};

export const Compact: Story = {
  args: {
    icon: Building2,
    category: "Urban Planning",
    title: "Urban Planners",
    description:
      "Access structured city data to support planning decisions and infrastructure projects.",
    variant: "compact",
  },
};
