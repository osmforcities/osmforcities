import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import AuthForm from './auth-form';
import { LAST_EMAIL_COOKIE } from '@/lib/last-email-cookie';

const setCookie = (value: string) => {
  document.cookie = `${LAST_EMAIL_COOKIE}=${encodeURIComponent(value)}; path=/`;
};

const clearCookie = () => {
  document.cookie = `${LAST_EMAIL_COOKIE}=; path=/; max-age=0`;
};

const stubFetch = (status: number, body: object) => {
  const original = globalThis.fetch;
  globalThis.fetch = fn(async () => Response.json(body, { status }));
  return () => {
    globalThis.fetch = original;
  };
};

const meta: Meta<typeof AuthForm> = {
  title: 'Pages/Enter/AuthForm',
  component: AuthForm,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const PrefillsLastEmail: Story = {
  beforeEach: () => {
    setCookie('returning+user@example.com');
    return clearCookie;
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByDisplayValue('returning+user@example.com')).toBeInTheDocument();
  },
};

export const EmptyWithoutCookie: Story = {
  beforeEach: () => {
    clearCookie();
    return stubFetch(200, { message: 'ok' });
  },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByPlaceholderText('Email');
    await expect(input).toHaveValue('');
    await userEvent.type(input, 'new@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(await canvas.findByText('Check your email')).toBeInTheDocument();
  },
};

export const ShowsTranslatedError: Story = {
  beforeEach: () => {
    clearCookie();
    return stubFetch(400, { error: 'Valid email is required' });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByPlaceholderText('Email'), 'bad@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(await canvas.findByText('Enter a valid email address.')).toBeInTheDocument();
  },
};
