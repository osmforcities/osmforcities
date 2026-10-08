import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import { useTranslations } from "next-intl";
import { DatasetWaitPage } from "./dataset-wait-page";
import { NotifyWhenReadyButton } from "./notify-when-ready-button";
import { DatasetTooLargeState } from "@/components/ui/dataset-error-states";
import { DatasetNoMapPage } from "@/components/ui/dataset-no-map-page";
import { withAppFrame } from "../../../.storybook/with-app-frame";

/**
 * The component polls the tiles-status route, which Storybook does not serve.
 * Each baking story answers that poll with a fixed stage, so the screen holds
 * still and the copy is what gets reviewed.
 */
function serveTilesStatus(status: Record<string, unknown>) {
  return () => {
    const realFetch = window.fetch;
    window.fetch = async () =>
      new Response(JSON.stringify(status), {
        headers: { "Content-Type": "application/json" },
      });
    return () => {
      window.fetch = realFetch;
    };
  };
}

/** The route's empty branch with its real keys, so the locale toolbar applies. */
function EmptyPage({
  templateName,
  areaName,
  areaId,
}: {
  templateName: string;
  areaName: string;
  areaId: number;
}) {
  const t = useTranslations("DatasetPage");
  return (
    <DatasetNoMapPage
      areaId={areaId}
      backLabel={t("backToAreaLabel", { area: areaName })}
      title={t("datasetInArea", { dataset: templateName, area: areaName })}
      lead={t("stateNoData")}
      description={t("emptyDescription")}
      action={<NotifyWhenReadyButton offer="mapped" />}
    />
  );
}

const meta = {
  title: "Pages/DatasetWaitPage",
  component: DatasetWaitPage,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [withAppFrame],
} satisfies Meta<typeof DatasetWaitPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const notify = <NotifyWhenReadyButton />;

/**
 * Step 1: the app's own count probe, before any bake and before any row
 * exists. Nothing to poll, nothing to save yet, so no offer.
 */
export const CountingWarm: Story = {
  args: {
    templateName: "Buildings",
    areaName: "Delft",
    areaId: 324431,
    mood: "counting",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Buildings in Delft" })
    ).toBeInTheDocument();
    await expect(canvas.getByText("Calculating size")).toBeInTheDocument();
    await expect(canvas.getByText("Step 1 of 5")).toBeInTheDocument();
    await expect(canvas.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow"
    );
  },
};

/**
 * The first count attempt gave up and a retry is running. The label carries
 * the honesty, since waiting screens have no sentence. The real page flips
 * at 30 s; the story flips at once.
 */
export const CountingCold: Story = {
  args: {
    ...CountingWarm.args,
    areaName: "São Paulo",
    areaId: 298285,
    coldAfterMs: 0,
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Still calculating size, large area")
    ).toBeInTheDocument();
    await expect(canvas.queryByText("Calculating size")).not.toBeInTheDocument();
    await expect(canvas.getByText("Step 1 of 5")).toBeInTheDocument();
  },
};

/** Step 2: submitted, waiting for the tiler to pick it up. The bar sweeps. */
export const BakingQueued: Story = {
  args: {
    datasetId: "ds-delft-buildings",
    templateName: "Buildings",
    areaName: "Delft",
    areaId: 324431,
    mood: "baking",
    notify,
  },
  beforeEach: serveTilesStatus({ state: "pending", stage: "queued" }),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Buildings in Delft" })
    ).toBeInTheDocument();
    await expect(
      await canvas.findByText("Waiting for a free slot")
    ).toBeInTheDocument();
    await expect(canvas.getByText("Step 2 of 5")).toBeInTheDocument();
    await expect(canvas.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow"
    );
    await expect(
      canvas.getByRole("button", { name: /Save and email me when it's ready/ })
    ).toBeInTheDocument();
  },
};

/** Fetching reports bytes, not a percentage: the total is unknown until the
 * fetch ends, so the bar keeps sweeping. */
export const BakingFetching: Story = {
  args: {
    datasetId: "ds-sp-highways",
    templateName: "Highways",
    areaName: "São Paulo",
    areaId: 298285,
    mood: "baking",
    notify,
  },
  beforeEach: serveTilesStatus({
    state: "pending",
    stage: "fetching",
    progress: { bytes: 88_080_384 },
  }),
  play: async ({ canvas }) => {
    // The stage arrives with the first poll, so it needs the retrying query.
    await expect(
      await canvas.findByText("Fetching data (84 MB)")
    ).toBeInTheDocument();
    await expect(canvas.getByText("Step 3 of 5")).toBeInTheDocument();
    await expect(canvas.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow"
    );
  },
};

/** First stage with a percentage: the bar gains a value. */
export const BakingConverting: Story = {
  args: {
    datasetId: "ds-sp-buildings",
    templateName: "Buildings",
    areaName: "São Paulo",
    areaId: 298285,
    mood: "baking",
    notify,
  },
  beforeEach: serveTilesStatus({
    state: "pending",
    stage: "converting",
    progress: { pct: 37, features: 792_000, bytes: 1_200_000_000, total: 3_200_000_000 },
  }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Converting features (37%)")
    ).toBeInTheDocument();
    await expect(canvas.getByText("Step 4 of 5")).toBeInTheDocument();
    await waitFor(() =>
      expect(canvas.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "37"
      )
    );
  },
};

/** Last stage. The in-scope worst case for size. */
export const BakingTiles: Story = {
  args: {
    ...BakingConverting.args,
  },
  beforeEach: serveTilesStatus({
    state: "pending",
    stage: "baking",
    progress: { pct: 62 },
  }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Baking map tiles (62%)")
    ).toBeInTheDocument();
    await expect(canvas.getByText("Step 5 of 5")).toBeInTheDocument();
    // The bar starts indeterminate and gains its value on the first poll, so
    // the assertion has to retry rather than the query.
    await waitFor(() =>
      expect(canvas.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "62"
      )
    );
  },
};

/** The button was already pressed, on this visit or an earlier one. The
 * confirmation never shows the address. */
export const NotifyConfirmed: Story = {
  args: {
    ...BakingFetching.args,
    notify: <NotifyWhenReadyButton saved />,
  },
  beforeEach: BakingFetching.beforeEach,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("status")
    ).toHaveTextContent("Saved. You'll get an email when the map is ready.");
    await expect(
      canvas.queryByRole("button", { name: /email me/i })
    ).not.toBeInTheDocument();
  },
};

/** Any failure the next scheduled update will retry. No steps, no poll. */
export const FailedNotReady: Story = {
  args: {
    datasetId: "ds-osasco-buildings",
    templateName: "Buildings",
    areaName: "Osasco",
    areaId: 298584,
    mood: "failed",
    notify,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Buildings in Osasco" })
    ).toBeInTheDocument();
    await expect(canvas.getByText("Bake failed.")).toBeInTheDocument();
    await expect(
      canvas.getByText(/next scheduled update will try again/)
    ).toBeInTheDocument();
    await expect(canvas.queryByRole("progressbar")).not.toBeInTheDocument();
    await expect(canvas.queryByText(/^Step /)).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: /Save and email me when it's ready/ })
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: "Back to Osasco" })
    ).toBeInTheDocument();
  },
};

/**
 * Overpass gave up before any row existed, on the count probe or on the
 * feature fetch after it. Load is usually the cause, and the timed-out verdict
 * is remembered for a short while, so the person retries later. No row, so no
 * offer.
 */
export const FailedTimedOut: Story = {
  args: {
    templateName: "Buildings",
    areaName: "São Paulo",
    areaId: 298285,
    mood: "timedOut",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Buildings in São Paulo" })
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("The data took too long to load.")
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(/Try again in at most 30 minutes/)
    ).toBeInTheDocument();
    await expect(canvas.queryByRole("progressbar")).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: "Back to São Paulo" })
    ).toBeInTheDocument();
  },
};

/**
 * The other half of the failure split. A tiler refusal is permanent, so it
 * lands on the existing too-large screen — same dead end as a query the app
 * refuses up front.
 */
export const FailedTooLarge: Story = {
  args: {
    datasetId: "ds-tokyo-buildings",
    templateName: "Buildings",
    areaName: "Tokyo",
    areaId: 1543125,
    mood: "failed",
  },
  render: (args) => (
    <DatasetTooLargeState
      templateName={args.templateName}
      areaName={args.areaName}
      areaId={args.areaId}
      notify={<NotifyWhenReadyButton offer="available" />}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Buildings in Tokyo" })
    ).toBeInTheDocument();
    await expect(canvas.getByText("Too large to bake.")).toBeInTheDocument();
    await expect(
      canvas.getByText(/exceeds the current server capacity/)
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", {
        name: /Save and email me if it becomes available/,
      })
    ).toBeInTheDocument();
  },
};

/**
 * The count probe refused the area with the tiles-only lane off. Same screen
 * as the tiler refusal, but no row exists yet, so no offer.
 */
export const FailedTooLargeAtCount: Story = {
  args: {
    templateName: "Buildings",
    areaName: "Tokyo",
    areaId: 1543125,
    mood: "failed",
  },
  render: (args) => (
    <DatasetTooLargeState
      templateName={args.templateName}
      areaName={args.areaName}
      areaId={args.areaId}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Buildings in Tokyo" })
    ).toBeInTheDocument();
    await expect(canvas.getByText("Too large to bake.")).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /email me/i })
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: "Back to Tokyo" })
    ).toBeInTheDocument();
  },
};

/**
 * The fourth member of the family. It lives inline in the dataset page rather
 * than in a component, so the story renders the shared shell with the same
 * copy — here to be reviewed beside its siblings. Saving an empty dataset
 * keeps it on the daily refresh, which picks up whatever gets mapped.
 */
export const Empty: Story = {
  args: {
    datasetId: "ds-osasco-hospitals",
    templateName: "Hospitals",
    areaName: "Osasco",
    areaId: 298470,
    mood: "failed",
  },
  render: (args) => <EmptyPage {...args} />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Hospitals in Osasco" })
    ).toBeInTheDocument();
    await expect(canvas.getByText("No data yet.")).toBeInTheDocument();
    await expect(
      canvas.getByText(/nobody has mapped them/)
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Save and email me if it gets mapped" })
    ).toBeInTheDocument();
  },
};
