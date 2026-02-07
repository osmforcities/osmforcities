import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { Card, CardHeader, CardContent, CardFooter } from './card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    a11y: { disable: false },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Card title (used for aria-label when onClick is provided)',
    },
    description: {
      control: 'text',
      description: 'Card description (used for title attribute)',
    },
    href: {
      control: 'text',
      description: 'Optional href to render card as link',
    },
    onClick: {
      action: 'clicked',
      description: 'Optional click handler to render card as button',
    },
    hoverable: {
      control: 'boolean',
      description: 'Enable hover effects',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Card content',
  },
  play: async ({ canvas }) => {
    const card = canvas.getByText('Card content');
    await expect(card).toBeInTheDocument();
  },
};

export const WithTitle: Story = {
  args: {
    title: 'Card Title',
    description: 'Card description text',
    children: 'Card content with title and description',
  },
  play: async ({ canvas }) => {
    const card = canvas.getByText('Card content with title and description');
    await expect(card).toBeInTheDocument();
    await expect(card).toHaveAttribute('title', 'Card description text');
  },
};

export const WithHeader: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">{'Card Header'}</h3>
      </CardHeader>
      <CardContent>
        <p>{'Card content goes here'}</p>
      </CardContent>
    </Card>
  ),
  play: async ({ canvas }) => {
    const header = canvas.getByText('Card Header');
    const content = canvas.getByText('Card content goes here');
    await expect(header).toBeInTheDocument();
    await expect(content).toBeInTheDocument();
  },
};

export const WithFooter: Story = {
  render: () => (
    <Card>
      <CardContent>
        <p>{'Card content'}</p>
      </CardContent>
      <CardFooter>
        <button className="text-sm text-olive-600">{'Action'}</button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvas }) => {
    const content = canvas.getByText('Card content');
    const footer = canvas.getByText('Action');
    await expect(content).toBeInTheDocument();
    await expect(footer).toBeInTheDocument();
  },
};

export const WithHeaderAndFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">{'Card Title'}</h3>
      </CardHeader>
      <CardContent>
        <p>{'Card content with header and footer'}</p>
      </CardContent>
      <CardFooter>
        <button className="text-sm text-olive-600">{'Footer Action'}</button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvas }) => {
    const header = canvas.getByText('Card Title');
    const content = canvas.getByText('Card content with header and footer');
    const footer = canvas.getByText('Footer Action');
    await expect(header).toBeInTheDocument();
    await expect(content).toBeInTheDocument();
    await expect(footer).toBeInTheDocument();
  },
};

export const Interactive: Story = {
  args: {
    title: 'Clickable Card',
    onClick: fn(),
    children: 'Click me to interact',
  },
  play: async ({ canvas, args, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Clickable Card' });
    await expect(button).toBeInTheDocument();
    await expect(button).toHaveAttribute('aria-label', 'Clickable Card');
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalled();
  },
};

export const AsLink: Story = {
  args: {
    href: '#example',
    title: 'Link Card',
    children: 'This card is a link',
  },
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link');
    await expect(link).toBeInTheDocument();
    await expect(link).toHaveAttribute('href', '#example');
    const content = canvas.getByText('This card is a link');
    await expect(content).toBeInTheDocument();
  },
};

export const NotHoverable: Story = {
  args: {
    hoverable: false,
    children: 'Card without hover effects',
  },
  play: async ({ canvas }) => {
    const card = canvas.getByText('Card without hover effects');
    await expect(card).toBeInTheDocument();
  },
};

export const ComplexExample: Story = {
  render: () => (
    <Card title="Dataset Card" description="A dataset about urban planning">
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold">{'Urban Planning Dataset'}</h3>
          <span className="text-sm text-gray-500">{'2024'}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-2">
          {'This dataset contains information about urban planning initiatives.'}
        </p>
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-gray-200 rounded text-xs">{'Planning'}</span>
          <span className="px-2 py-1 bg-gray-200 rounded text-xs">{'Urban'}</span>
        </div>
      </CardContent>
      <CardFooter>
        <button className="text-sm text-olive-600 hover:underline">
          {'View Details'}
        </button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvas }) => {
    const title = canvas.getByText('Urban Planning Dataset');
    const content = canvas.getByText(/This dataset contains/);
    const footer = canvas.getByText('View Details');
    await expect(title).toBeInTheDocument();
    await expect(content).toBeInTheDocument();
    await expect(footer).toBeInTheDocument();
  },
};
