import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { Button } from './button';
import { ArrowRight, Download, Plus } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'outline', 'ghost', 'link'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
      description: 'Button size',
    },
    asChild: {
      control: 'boolean',
      description: 'Render as child element (using Radix Slot)',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
    onClick: fn(),
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Button' });
    await expect(button).toBeInTheDocument();
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link Button',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
    onClick: fn(),
  },
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole('button', { name: 'Disabled Button' });
    await expect(button).toBeDisabled();
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'primary',
    children: (
      <>
        {'Download'}
        <Download className="size-4" />
      </>
    ),
  },
};

export const IconOnly: Story = {
  args: {
    variant: 'outline',
    size: 'sm',
    'aria-label': 'Add item',
    children: <Plus className="size-4" />,
    onClick: fn(),
  },
  play: async ({ canvas, args, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Add item' });
    await expect(button).toBeInTheDocument();
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalled();
  },
};

export const AsLink: Story = {
  args: {
    variant: 'primary',
    asChild: true,
    children: (
      <a href="#example">
        {'Link styled as button'}
        <ArrowRight className="size-4" />
      </a>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button variant="default">{'Default'}</Button>
        <Button variant="primary">{'Primary'}</Button>
        <Button variant="secondary">{'Secondary'}</Button>
        <Button variant="outline">{'Outline'}</Button>
        <Button variant="ghost">{'Ghost'}</Button>
        <Button variant="link">{'Link'}</Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button variants displayed together.',
      },
    },
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">{'Small'}</Button>
      <Button size="default">{'Default'}</Button>
      <Button size="lg">{'Large'}</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button sizes.',
      },
    },
  },
};

export const RTLTest: Story = {
  render: () => (
    <div className="flex flex-col gap-4" dir="rtl">
      <div className="flex gap-3">
        <Button variant="primary">
          <ArrowRight className="size-4" />
          {'تحميل'}
        </Button>
        <Button variant="outline">
          {'زر مع أيقونة'}
          <Download className="size-4" />
        </Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'RTL (Right-to-Left) layout test with Arabic text. Icons and flex direction adjust automatically.',
      },
    },
  },
};
