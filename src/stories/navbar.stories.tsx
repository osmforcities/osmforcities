import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MockNavBar } from "./story-shell";

const meta: Meta<typeof MockNavBar> = {
  title: "Layout/Navbar",
  component: MockNavBar,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-neutral-50">
        <Story />
        <div className="p-8 text-sm text-neutral-400 text-center">
          Page content area
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MockNavBar>;

// --- Logged out ---

export const LoggedOut_Home: Story = {
  name: "Logged out / Home",
  args: { isLoggedIn: false },
};

export const LoggedOut_Area: Story = {
  name: "Logged out / Area page",
  args: { isLoggedIn: false, pageTitle: "Paris" },
};

export const LoggedOut_Dataset: Story = {
  name: "Logged out / Dataset page",
  args: { isLoggedIn: false, pageTitle: "Bicycle Parking", backLabel: "Paris" },
};

// --- Logged in ---

export const LoggedIn_Dashboard: Story = {
  name: "Logged in / Dashboard (home)",
  args: { isLoggedIn: true, pageTitle: "Dashboard" },
};

export const LoggedIn_Explore: Story = {
  name: "Logged in / Explore",
  args: { isLoggedIn: true, pageTitle: "Explore" },
};

export const LoggedIn_Area: Story = {
  name: "Logged in / Area page",
  args: { isLoggedIn: true, pageTitle: "Paris" },
};

export const LoggedIn_Dataset: Story = {
  name: "Logged in / Dataset page",
  args: { isLoggedIn: true, pageTitle: "Bicycle Parking", backLabel: "Paris" },
};

export const LoggedIn_Preferences: Story = {
  name: "Logged in / Preferences (utility page)",
  args: { isLoggedIn: true, pageTitle: "Preferences", pageTitleMuted: true },
};

export const LoggedIn_Users: Story = {
  name: "Logged in / Users (utility page)",
  args: { isLoggedIn: true, pageTitle: "Users", pageTitleMuted: true },
};
