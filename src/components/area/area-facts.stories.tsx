import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import type { Area } from "@/types/area";
import { AreaFacts } from "./area-facts";

const mexicoCity: Area = {
  id: 17483459,
  name: "Mexico City",
  displayName: "Mexico City, Mexico",
  osmType: "relation",
  class: "boundary",
  type: "administrative",
  addresstype: "city",
  boundingBox: [19.24, -99.31, 19.58, -98.98],
  country: "Mexico",
  state: "Mexico City",
  population: 9209944,
  populationDate: "2020",
  elevation: 2250,
  isCapital: true,
  wikipedia: "es:Ciudad de México",
  wikidata: "Q1489",
};

const meta = {
  title: "Area/Facts",
  component: AreaFacts,
  parameters: { a11y: { test: "error" } },
  args: { area: mexicoCity, parentPlaces: ["Mexico"] },
} satisfies Meta<typeof AreaFacts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullFacts: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("area-facts")).toHaveTextContent(
      "Capital city · Mexico · Population 9.2M (2020) · Elevation 2,250 m"
    );
    await expect(canvas.getByRole("link", { name: "OpenStreetMap" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/relation/17483459"
    );
    await expect(canvas.getByRole("link", { name: "Wikipedia" })).toHaveAttribute(
      "href",
      "https://es.wikipedia.org/wiki/Ciudad_de_M%C3%A9xico"
    );
    await expect(canvas.getByRole("link", { name: "Wikidata" })).toHaveAttribute(
      "href",
      "https://www.wikidata.org/wiki/Q1489"
    );
  },
};

/** No extratags: the place type stays, the OpenStreetMap link always shows. */
export const EmptyFacts: Story = {
  args: {
    area: {
      ...mexicoCity,
      population: undefined,
      populationDate: undefined,
      elevation: undefined,
      isCapital: false,
      wikipedia: undefined,
      wikidata: undefined,
    },
    parentPlaces: [],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("area-facts")).toHaveTextContent(/^City$/);
    await expect(canvas.getAllByRole("link")).toHaveLength(1);
    await expect(canvas.getByRole("link", { name: "OpenStreetMap" })).toBeVisible();
  },
};
