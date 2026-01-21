import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { SearchInput } from './search-input';
import { useState } from 'react';

const meta: Meta<typeof SearchInput> = {
  title: 'UI/SearchInput',
  component: SearchInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    a11y: { disable: false },
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'Current search value',
    },
    onChange: {
      action: 'changed',
      description: 'Callback when value changes',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: '',
    onChange: fn(),
    placeholder: 'Search...',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByPlaceholderText('Search...');
    await expect(input).toBeInTheDocument();
    await expect(input).toHaveAttribute('type', 'text');
  },
};

export const WithValue: Story = {
  args: {
    value: 'Search term',
    onChange: fn(),
    placeholder: 'Search...',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByDisplayValue('Search term');
    await expect(input).toBeInTheDocument();
    await expect(input).toHaveValue('Search term');
  },
};

export const CustomPlaceholder: Story = {
  args: {
    value: '',
    onChange: fn(),
    placeholder: 'Search datasets...',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByPlaceholderText('Search datasets...');
    await expect(input).toBeInTheDocument();
  },
};

export const TypingInteraction: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <SearchInput
        value={value}
        onChange={setValue}
        placeholder="Type to search..."
      />
    );
  },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByPlaceholderText('Type to search...');
    await expect(input).toBeInTheDocument();
    await expect(input).toHaveValue('');
    await userEvent.type(input, 'test query');
    await expect(input).toHaveValue('test query');
  },
};

export const Empty: Story = {
  args: {
    value: '',
    onChange: fn(),
    placeholder: 'Search...',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByPlaceholderText('Search...');
    await expect(input).toBeInTheDocument();
    await expect(input).toHaveValue('');
  },
};

export const WithLongValue: Story = {
  args: {
    value: 'This is a very long search query that might overflow',
    onChange: fn(),
    placeholder: 'Search...',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByDisplayValue('This is a very long search query that might overflow');
    await expect(input).toBeInTheDocument();
  },
};

export const KeyboardNavigation: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="w-64">
        <SearchInput
          value={value}
          onChange={setValue}
          placeholder="Press Tab to focus..."
        />
      </div>
    );
  },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByPlaceholderText('Press Tab to focus...');
    await expect(input).toBeInTheDocument();
    await input.focus();
    await expect(input).toHaveFocus();
    await userEvent.type(input, 'keyboard test');
    await expect(input).toHaveValue('keyboard test');
  },
};
