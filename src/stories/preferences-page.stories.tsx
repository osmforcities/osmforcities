import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { StoryShell } from './story-shell';

const sections = [
  { id: 'general', label: 'General' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'account', label: 'Account' },
];

function GeneralSection() {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Language</label>
        <select className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-200">
          <option>English</option>
          <option>Español</option>
          <option>Português</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Theme</label>
        <div className="flex gap-3">
          {['System', 'Light', 'Dark'].map((t) => (
            <button key={t} className={`px-4 py-2 rounded-lg text-sm border ${t === 'System' ? 'bg-olive-50 border-olive-300 text-olive-700 dark:bg-olive-950 dark:border-olive-700 dark:text-olive-400' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="pt-2">
        <button className="px-5 py-2.5 bg-olive-600 text-white rounded-lg text-sm font-medium hover:bg-olive-700 transition-colors">
          Save changes
        </button>
      </div>
    </div>
  );
}

function NotificationsSection() {
  return (
    <div className="space-y-4">
      {[
        { label: 'Dataset updates', description: 'When monitored datasets are refreshed' },
        { label: 'Weekly digest', description: 'Summary of changes across your areas' },
        { label: 'New template alerts', description: 'When new templates are added to your categories' },
      ].map((item) => (
        <div key={item.label} className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{item.label}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{item.description}</p>
          </div>
          <div className="w-10 h-6 rounded-full bg-olive-500 relative cursor-pointer flex-shrink-0">
            <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountSection() {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Display name</label>
        <input className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-200" defaultValue="Vitor" readOnly />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Email</label>
        <input className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-400" defaultValue="vitor@example.com" readOnly />
        <p className="text-xs text-neutral-400 mt-1">Managed via your auth provider</p>
      </div>
      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Danger zone</p>
        <button className="px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
          Delete account
        </button>
      </div>
    </div>
  );
}

const sectionContent: Record<string, React.ReactNode> = {
  general: <GeneralSection />,
  notifications: <NotificationsSection />,
  account: <AccountSection />,
};

function PreferencesPage() {
  const [activeSection, setActiveSection] = useState('general');

  return (
    <StoryShell pageTitle="Preferences" pageTitleMuted>
    <div
      className="flex border-b border-neutral-200 dark:border-neutral-800"
      style={{ height: 'calc(100vh - var(--nav-height))' }}
    >
      {/* Left panel */}
      <aside className="w-[36%] min-w-52 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-y-auto">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Preferences</h1>
        </div>
        <nav className="flex-1 py-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center px-6 py-3 text-left text-sm transition-colors ${
                activeSection === s.id
                  ? 'bg-olive-50 dark:bg-olive-950 border-r-2 border-olive-600 font-medium text-olive-700 dark:text-olive-400'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Right panel */}
      <main className="flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-900 overflow-y-auto">
        <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 capitalize">{activeSection}</h2>
        </div>
        <div className="p-8 max-w-lg">
          {sectionContent[activeSection]}
        </div>
      </main>
    </div>
    </StoryShell>
  );
}

const meta: Meta<typeof PreferencesPage> = {
  title: 'Layout/Pages/Preferences',
  component: PreferencesPage,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
