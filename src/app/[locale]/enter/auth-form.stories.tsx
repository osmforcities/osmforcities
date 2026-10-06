import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, type Mock } from 'storybook/test';
import AuthForm from './auth-form';
import { LAST_EMAIL_COOKIE } from '@/lib/last-email-cookie';

const REMEMBER_LABEL = 'Remember my email on this device (uses a cookie)';

const setCookie = (value: string) => {
  document.cookie = `${LAST_EMAIL_COOKIE}=${encodeURIComponent(value)}; path=/`;
};

const clearCookie = () => {
  document.cookie = `${LAST_EMAIL_COOKIE}=; path=/; max-age=0`;
};

let fetchMock: Mock;

const stubFetch = (status: number, body: object) => {
  const original = globalThis.fetch;
  fetchMock = fn(async () => Response.json(body, { status }));
  globalThis.fetch = fetchMock;
  return () => {
    globalThis.fetch = original;
  };
};

const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body);

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
    await expect(canvas.getByLabelText(REMEMBER_LABEL)).toBeChecked();
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
    await expect(canvas.getByLabelText(REMEMBER_LABEL)).not.toBeChecked();
    await userEvent.type(input, 'new@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(await canvas.findByText('Check your email')).toBeInTheDocument();
    await expect(sentBody()).toEqual({ email: 'new@example.com', remember: false });
  },
};

export const OptInToRemember: Story = {
  beforeEach: () => {
    clearCookie();
    return stubFetch(200, { message: 'ok' });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByPlaceholderText('Email'), 'new@example.com');
    await userEvent.click(canvas.getByLabelText(REMEMBER_LABEL));
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(await canvas.findByText('Check your email')).toBeInTheDocument();
    await expect(sentBody()).toEqual({ email: 'new@example.com', remember: true });
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
