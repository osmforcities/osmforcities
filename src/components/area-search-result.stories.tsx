import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { AreaSearchResult } from './area-search-result';
import { toAreaSearchResult } from '@/lib/area-search';
import { NominatimSearchResponseSchema } from '@/schemas/nominatim';
import parisRaw from '@/lib/__tests__/fixtures/nominatim-search-paris.json';
import saoPauloRaw from '@/lib/__tests__/fixtures/nominatim-search-sao-paulo.json';
import rioRaw from '@/lib/__tests__/fixtures/nominatim-search-rio.json';
import londonRaw from '@/lib/__tests__/fixtures/nominatim-search-london.json';

const [saoPauloCity, , saoPauloState] =
  NominatimSearchResponseSchema.parse(saoPauloRaw);
const [, rioState] = NominatimSearchResponseSchema.parse(rioRaw);
const [, cityOfLondon] = NominatimSearchResponseSchema.parse(londonRaw);
const [parisCommune] = NominatimSearchResponseSchema.parse(parisRaw);

const meta: Meta<typeof AreaSearchResult> = {
  title: 'Search/AreaSearchResult',
  component: AreaSearchResult,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-96 px-4 py-3 bg-white">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const CityWithPopulation: Story = {
  args: { area: toAreaSearchResult(saoPauloCity) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('São Paulo')).toBeInTheDocument();
    await expect(canvas.getByTestId('area-parents')).toHaveTextContent(
      /^São Paulo, Brazil$/
    );
    await expect(canvas.getByTestId('area-population')).toHaveTextContent(
      /^11\.5M people$/
    );
    await expect(canvas.getByText('City')).toBeInTheDocument();
    await expect(canvas.queryByText(/ID:/)).not.toBeInTheDocument();
  },
};

export const StateWithPopulation: Story = {
  args: { area: toAreaSearchResult(saoPauloState) },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('area-parents')).toHaveTextContent(
      /^Brazil$/
    );
    await expect(canvas.getByTestId('area-population')).toHaveTextContent(
      /^45\.5M people$/
    );
    await expect(canvas.getByText('State')).toBeInTheDocument();
  },
};

export const StateWithoutPopulation: Story = {
  args: { area: toAreaSearchResult(rioState) },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('area-parents')).toHaveTextContent(
      /^Brazil$/
    );
    await expect(canvas.queryByTestId('area-population')).not.toBeInTheDocument();
  },
};

export const SmallPopulation: Story = {
  // City of London vs Greater London: population is the tell.
  args: { area: toAreaSearchResult(cityOfLondon) },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('area-population')).toHaveTextContent(
      /^10\.8K people$/
    );
  },
};

export const DemotedCommune: Story = {
  args: { area: toAreaSearchResult(parisCommune) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('City')).toBeInTheDocument();
    await expect(canvas.queryByText('Suburb')).not.toBeInTheDocument();
    await expect(canvas.getByTestId('area-parents')).toHaveTextContent(
      /^Ile-de-France, France$/
    );
  },
};
