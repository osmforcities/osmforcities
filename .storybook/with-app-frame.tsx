import type { Decorator } from '@storybook/react';
import React from 'react';
import { NavBarView } from '../src/components/nav-bar-view';

/**
 * The locale layout's chrome around a page story: the real nav bar over a
 * flex column, so a full-page state is reviewed the way a visitor sees it.
 * Pages under `Pages/` opt in; component stories stay bare.
 */
export const withAppFrame: Decorator = (Story) => (
  <div className="min-h-screen flex flex-col">
    <NavBarView isLoggedIn />
    <main className="flex-1">
      <Story />
    </main>
  </div>
);
