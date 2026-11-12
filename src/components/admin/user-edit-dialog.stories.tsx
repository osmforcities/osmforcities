import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, within, type Mock } from "storybook/test";
import { UserEditDialog } from "./user-edit-dialog";

let fetchMock: Mock;

const stubFetch = (status: number) => {
  const original = globalThis.fetch;
  fetchMock = fn(async () => Response.json({}, { status }));
  globalThis.fetch = fetchMock;
  return () => {
    globalThis.fetch = original;
  };
};

const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body);

const meta: Meta<typeof UserEditDialog> = {
  title: "Admin/UserEditDialog",
  component: UserEditDialog,
  args: {
    user: { id: "u2", email: "importer@example.com", isAdmin: false, saveLimit: null },
    isSelf: false,
    defaultSaveLimit: 10,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const openDialog = async (
  canvas: { getByRole: (role: string, options: { name: RegExp }) => HTMLElement },
  userEvent: { click: (el: HTMLElement) => Promise<void> },
) => {
  await userEvent.click(canvas.getByRole("button", { name: /^Edit / }));
  return within(await screen.findByRole("dialog"));
};

export const PromotesAndSetsLimit: Story = {
  beforeEach: () => stubFetch(200),
  play: async ({ canvas, userEvent }) => {
    const dialog = await openDialog(canvas, userEvent);
    await expect(dialog.getByRole("heading", { name: "Edit importer@example.com" })).toBeInTheDocument();
    await userEvent.click(dialog.getByRole("checkbox", { name: "Admin" }));
    await userEvent.type(dialog.getByLabelText("Save limit"), "30");
    await userEvent.click(dialog.getByRole("button", { name: "Update user" }));
    await expect(fetchMock).toHaveBeenCalledWith("/api/users/u2", expect.objectContaining({ method: "PATCH" }));
    await expect(sentBody()).toEqual({ isAdmin: true, saveLimit: 30 });
  },
};

export const ClearingLimitSendsNull: Story = {
  args: { user: { id: "u2", email: "importer@example.com", isAdmin: false, saveLimit: 30 } },
  beforeEach: () => stubFetch(200),
  play: async ({ canvas, userEvent }) => {
    const dialog = await openDialog(canvas, userEvent);
    await userEvent.clear(dialog.getByLabelText("Save limit"));
    await userEvent.click(dialog.getByRole("button", { name: "Update user" }));
    await expect(sentBody()).toEqual({ isAdmin: false, saveLimit: null });
  },
};

export const OwnAdminLocked: Story = {
  args: {
    user: { id: "u1", email: "me@example.com", isAdmin: true, saveLimit: null },
    isSelf: true,
  },
  play: async ({ canvas, userEvent }) => {
    const dialog = await openDialog(canvas, userEvent);
    await expect(dialog.getByRole("checkbox", { name: "Admin" })).toBeDisabled();
    await expect(dialog.getByText("You can't remove your own admin access.")).toBeInTheDocument();
  },
};

export const ShowsFailure: Story = {
  beforeEach: () => stubFetch(500),
  play: async ({ canvas, userEvent }) => {
    const dialog = await openDialog(canvas, userEvent);
    await userEvent.click(dialog.getByRole("button", { name: "Update user" }));
    await expect(await dialog.findByRole("alert")).toHaveTextContent("Could not update the user.");
  },
};
