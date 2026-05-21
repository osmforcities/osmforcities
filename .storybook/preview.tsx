import type { Preview } from '@storybook/react';
import { QueryProvider } from '../src/hooks/QueryProvider';
import { NextIntlClientProvider } from 'next-intl';
import '../src/app/globals.css';
import React from 'react';

import enMessages from '../messages/en.json';
import esMessages from '../messages/es.json';
import ptBRMessages from '../messages/pt-BR.json';

const messages: Record<string, Record<string, unknown>> = {
  en: enMessages,
  es: esMessages,
  'pt-BR': ptBRMessages,
};

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    locale: {
      description: 'Internationalization locale',
      defaultValue: 'en',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'es', title: 'Español' },
          { value: 'pt-BR', title: 'Português (BR)' },
        ],
        dynamicTitle: true,
      },
    },
    theme: {
      description: 'Global theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    dir: {
      description: 'Text direction',
      defaultValue: 'ltr',
      toolbar: {
        title: 'Direction',
        icon: 'transfer',
        items: [
          { value: 'ltr', title: 'LTR' },
          { value: 'rtl', title: 'RTL' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const locale = context.globals.locale || 'en';
      const localeMessages = messages[locale] || messages.en;

      return (
        <QueryProvider>
          <NextIntlClientProvider
            locale={locale}
            messages={localeMessages}
            timeZone="UTC"
          >
            <Story />
          </NextIntlClientProvider>
        </QueryProvider>
      );
    },
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      const dir = context.globals.dir || 'ltr';

      React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }, [theme, dir]);

      return <Story />;
    },
  ],
};

export default preview;
