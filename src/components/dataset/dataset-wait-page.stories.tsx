import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { useTranslations } from "next-intl";
import { DatasetWaitPage } from "./dataset-wait-page";
import { NotifyWhenReadyButton } from "./notify-when-ready-button";
import { TemplateSummary } from "./template-summary";
import { DatasetTimestamps } from "./dataset-timestamps";
import type { Dataset } from "@/schemas/dataset";
import { DatasetTooLargeState } from "@/components/ui/dataset-error-states";
import { DatasetNoMapPage } from "@/components/ui/dataset-no-map-page";
import { withAppFrame } from "../../../.storybook/with-app-frame";
import { serveRoute } from "../../../.storybook/serve-route";
import rotterdam from "./__fixtures__/boundary-324431.json";
import saoPaulo from "./__fixtures__/boundary-298285.json";
import osasco from "./__fixtures__/boundary-298470.json";
import tokyo from "./__fixtures__/boundary-1543125.json";

/**
 * The component polls the tiles-status route, which Storybook does not serve.
 * Each baking story answers that poll with a fixed stage, so the screen holds
 * still and the copy is what gets reviewed.
 */
function serveTilesStatus(status: Record<string, unknown>) {
  return serveRoute("/tiles-status", () => status);
}

/** The areas' real OSM boundaries, simplified hard to stay small. */
const BOUNDARIES: Record<string, unknown> = {
  "324431": rotterdam,
  "298285": saoPaulo,
  "298470": osasco,
  "1543125": tokyo,
};

function storedBoundary(url: string) {
  return BOUNDARIES[url.match(/areas\/(\d+)\/boundary/)?.[1] ?? ""] ?? null;
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
      categoryHref="/area/1/topics/mobility"
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
  beforeEach: serveRoute("/boundary", storedBoundary),
  args: { categoryHref: "/area/1/topics/mobility" },
} satisfies Meta<typeof DatasetWaitPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const notify = <NotifyWhenReadyButton />;

/** Signed out on a featured page: nobody to save for, so no offer. */
export const CountingWarm: Story = {
  args: {
    templateName: "Buildings",
    areaName: "Rotterdam",
    areaId: 324431,
    mood: "counting",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Buildings in Rotterdam" })
    ).toBeInTheDocument();
    await expect(canvas.getByText("Checking the data size")).toBeInTheDocument();
    await expect(canvas.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow"
    );
  },
};

/** Every stage names what the dataset holds and how it is selected. */
const rotterdamSummary = {
  description: "Buildings of every kind, mapped as outlines",
  query:
    '[out:json];\nrel(324431);\nmap_to_area -> .searchArea;\nnwr["building"](area.searchArea);\nout geom meta;',
  category: { slug: "buildings" },
  areaName: "Rotterdam",
  categoryHref: "/area/324431/topics/built-environment/buildings",
};

export const CountingWithSummary: Story = {
  args: {
    ...CountingWarm.args,
    summary: <TemplateSummary {...rotterdamSummary} />,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Buildings of every kind, mapped as outlines")
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: /Rotterdam/ })
    ).toBeVisible();
    await expect(canvas.getByText("Edited, not available yet")).toBeInTheDocument();
    await expect(canvas.getByText("Fetched, not available yet")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Query" })).toBeVisible();
  },
};

export const SummaryWithKnownTimestamps: Story = {
  args: {
    ...CountingWithSummary.args,
    summary: (
      <TemplateSummary
        {...rotterdamSummary}
        timestamps={
          <DatasetTimestamps
            dataset={{ stats: null } as unknown as Dataset}
            lastChecked={new Date(Date.now() - 1000)}
          />
        }
      />
    ),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /^Fetched \d+ seconds? ago$/ })
    ).toBeVisible();
    await expect(
      canvas.queryByText("Fetched, not available yet")
    ).not.toBeInTheDocument();
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
      await canvas.findByText("Still checking, large area")
    ).toBeInTheDocument();
    await expect(canvas.queryByText("Checking the data size")).not.toBeInTheDocument();
  },
};

/**
 * Counting on the tiles-only lane: the row exists while the probe runs after
 * the response, so the page polls and offers saving from the start.
 */
export const CountingWithRow: Story = {
  args: {
    datasetId: "ds-sao-paulo-buildings",
    templateName: "Buildings",
    areaName: "São Paulo",
    areaId: 298285,
    mood: "counting",
    notify,
  },
  beforeEach: serveTilesStatus({ state: "pending", stage: "counting" }),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Checking the data size")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: /Save it and get an email when it's ready/ })
    ).toBeInTheDocument();
  },
};

/** Submitted, waiting for the tiler to pick it up. The bar sweeps. */
export const BakingQueued: Story = {
  args: {
    datasetId: "ds-rotterdam-buildings",
    templateName: "Buildings",
    areaName: "Rotterdam",
    areaId: 324431,
    mood: "baking",
    notify,
  },
  beforeEach: serveTilesStatus({ state: "pending", stage: "queued" }),
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole("heading", { name: "Buildings in Rotterdam" })
    ).toBeInTheDocument();
    await expect(
      await canvas.findByText("Waiting in line")
    ).toBeInTheDocument();
    // The outline is served, so the basemap mounts on it.
    await waitFor(() =>
      expect(canvasElement.querySelector(".maplibregl-map")).not.toBeNull()
    );
    await expect(canvas.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow"
    );
    await expect(
      canvas.getByRole("button", { name: /Save it and get an email when it's ready/ })
    ).toBeInTheDocument();
  },
};

/** An area with no outline has nowhere to frame a map: the place stays an
 * empty well. */
export const NoOutline: Story = {
  args: { ...BakingQueued.args, areaId: 1 },
  beforeEach: BakingQueued.beforeEach,
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText("Waiting in line")).toBeInTheDocument();
    await expect(canvasElement.querySelector(".maplibregl-map")).toBeNull();
  },
};

/** Fetching reports bytes, not a percentage: the total is unknown until the
 * fetch ends, so the bar keeps sweeping. */
export const BakingFetching: Story = {
  args: {
    datasetId: "ds-sp-roads",
    templateName: "Streets and roads",
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
      await canvas.findByText("Downloading OpenStreetMap data")
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(/84 MB so far. The total is only known when the download ends/)
    ).toBeInTheDocument();
    await expect(canvas.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow"
    );
  },
};

/** Most fetches finish before a megabyte lands, so no size is shown until one does. */
export const BakingFetchingFirstMegabyte: Story = {
  args: { ...BakingFetching.args },
  beforeEach: serveTilesStatus({
    state: "pending",
    stage: "fetching",
    progress: { bytes: 0 },
  }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Downloading OpenStreetMap data")).toBeInTheDocument();
    await expect(canvas.queryByText(/MB/)).not.toBeInTheDocument();
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
      await canvas.findByText("Preparing the data")
    ).toBeInTheDocument();
    await expect(canvas.getByText("37%")).toBeInTheDocument();
    await waitFor(() =>
      expect(canvas.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "37"
      )
    );
  },
};

/**
 * Last stage. The in-scope worst case for size. Baking runs several passes
 * that each restart from 0%, so the bar sweeps and the time since submit
 * stands in for the percentage.
 */
export const BakingTiles: Story = {
  args: {
    ...BakingConverting.args,
  },
  beforeEach: serveTilesStatus({
    state: "pending",
    stage: "baking",
    progress: { pct: 62 },
    startedAt: new Date(Date.now() - 12.5 * 60_000).toISOString(),
  }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Building the map")
    ).toBeInTheDocument();
    await expect(await canvas.findByText("12 min")).toBeInTheDocument();
    await expect(canvas.queryByText("62%")).not.toBeInTheDocument();
    // No step count: an interrupted bake starts over, so "N of 5" would go backwards
    await expect(canvas.queryByText(/Step \d of/)).not.toBeInTheDocument();
    await expect(canvas.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow"
    );
  },
};

/** The first minute shows no time: "0 min" reads as stuck. */
export const BakingFirstMinute: Story = {
  args: { ...BakingConverting.args },
  beforeEach: serveTilesStatus({
    state: "pending",
    stage: "baking",
    startedAt: new Date().toISOString(),
  }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Building the map")
    ).toBeInTheDocument();
    await expect(canvas.queryByText(/min/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/%/)).not.toBeInTheDocument();
  },
};

/** The bake is done while the app pulls its archive: still the last stage, full. */
export const BakeLandedArchivePulling: Story = {
  args: { ...BakingConverting.args },
  beforeEach: serveTilesStatus({ state: "pending", stage: "done" }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Building the map")
    ).toBeInTheDocument();
    await expect(canvas.getByText("100%")).toBeInTheDocument();
    await waitFor(() =>
      expect(canvas.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
    );
  },
};

/** Done, while the refresh to the map is in flight: still the last stage, full. */
export const BakeDoneMapLoading: Story = {
  args: { ...BakingConverting.args },
  beforeEach: serveTilesStatus({ state: "done" }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Building the map")
    ).toBeInTheDocument();
    await expect(canvas.getByText("100%")).toBeInTheDocument();
  },
};

/** The cron deleted the row mid-bake: the refresh recreates it. */
export const RowDeletedWhileBaking: Story = {
  args: { ...BakingConverting.args },
  beforeEach: serveRoute("/tiles-status", () => null, 404),
  play: async () => {
    await waitFor(() => expect(getRouter().refresh).toHaveBeenCalled());
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
    ).toHaveTextContent(/You'll get an email when the map is ready/);
    await expect(
      canvas.queryByRole("button", { name: /Save it and get an email/ })
    ).not.toBeInTheDocument();
  },
};

/** Any failure a later visit will retry. No steps, no poll. */
export const FailedNotReady: Story = {
  args: {
    datasetId: "ds-osasco-buildings",
    templateName: "Buildings",
    areaName: "Osasco",
    areaId: 298470,
    mood: "failed",
    notify,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Buildings in Osasco" })
    ).toBeInTheDocument();
    await expect(canvas.getByText("Bake failed.")).toBeInTheDocument();
    await expect(
      canvas.getByText("Open this page later to try again.")
    ).toBeInTheDocument();
    await expect(canvas.queryByRole("progressbar")).not.toBeInTheDocument();
    await expect(canvas.queryByText(/^Step /)).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: /Save it and get an email when it's ready/ })
    ).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      expect.stringContaining("/area/1/topics/mobility")
    );
  },
};

/** Overpass gave up on the count probe, usually under load. Signed out, so no offer. */
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
    await expect(canvas.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      expect.stringContaining("/area/1/topics/mobility")
    );
  },
};

/** The row outlives a timed-out probe, so saving keeps it on the retry schedule. */
export const FailedTimedOutWithRow: Story = {
  args: {
    datasetId: "ds-sao-paulo-buildings",
    templateName: "Buildings",
    areaName: "São Paulo",
    areaId: 298285,
    mood: "timedOut",
    notify,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("The data took too long to load.")
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: /Save it and get an email when it's ready/ })
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
      categoryHref={args.categoryHref}
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
        name: /Save it and get an email if it becomes available/,
      })
    ).toBeInTheDocument();
  },
};

/** The tiler's refusal as a signed-out visitor sees it: no offer. */
export const FailedTooLargeSignedOut: Story = {
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
      categoryHref={args.categoryHref}
      areaId={args.areaId}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Buildings in Tokyo" })
    ).toBeInTheDocument();
    await expect(canvas.getByText("Too large to bake.")).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /Save it and get an email/ })
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      expect.stringContaining("/area/1/topics/mobility")
    );
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
      canvas.getByRole("button", { name: /Save it and get an email if it gets mapped/ })
    ).toBeInTheDocument();
  },
};
