import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { StoryShell } from './story-shell';

const allUsers = [
  { id: 1, name: 'Ana Silva', email: 'ana@example.com', role: 'admin', status: 'active', joined: '2025-03-12' },
  { id: 2, name: 'Kenji Yamamoto', email: 'kenji@example.com', role: 'contributor', status: 'active', joined: '2025-07-04' },
  { id: 3, name: 'Marie Dupont', email: 'marie@example.com', role: 'viewer', status: 'active', joined: '2025-09-21' },
  { id: 4, name: 'Luca Ferri', email: 'luca@example.com', role: 'contributor', status: 'inactive', joined: '2025-11-01' },
  { id: 5, name: 'Sara Johansson', email: 'sara@example.com', role: 'viewer', status: 'active', joined: '2026-01-15' },
  { id: 6, name: 'Omar Hassan', email: 'omar@example.com', role: 'moderator', status: 'active', joined: '2026-02-08' },
];

const roles = ['All roles', 'admin', 'moderator', 'contributor', 'viewer'];
const statuses = ['All statuses', 'active', 'inactive'];

const roleBadge: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  moderator: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
  contributor: 'bg-olive-100 text-olive-700 dark:bg-olive-950 dark:text-olive-400',
  viewer: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
};

function UsersPage() {
  const [roleFilter, setRoleFilter] = useState('All roles');
  const [statusFilter, setStatusFilter] = useState('All statuses');

  const filtered = allUsers.filter((u) => {
    const matchRole = roleFilter === 'All roles' || u.role === roleFilter;
    const matchStatus = statusFilter === 'All statuses' || u.status === statusFilter;
    return matchRole && matchStatus;
  });

  return (
    <StoryShell>
    <div
      className="flex border-b border-neutral-200 dark:border-neutral-800"
      style={{ height: 'calc(100vh - var(--nav-height))' }}
    >
      {/* Left panel */}
      <aside className="w-[36%] min-w-52 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-y-auto">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Users</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{allUsers.length} total</p>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Role</p>
            <div className="space-y-1">
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    roleFilter === r
                      ? 'bg-olive-50 dark:bg-olive-950 text-olive-700 dark:text-olive-400 font-medium'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <span className="capitalize">{r}</span>
                  {r !== 'All roles' && (
                    <span className="text-xs text-neutral-400">{allUsers.filter((u) => u.role === r).length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Status</p>
            <div className="space-y-1">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    statusFilter === s
                      ? 'bg-olive-50 dark:bg-olive-950 text-olive-700 dark:text-olive-400 font-medium'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <span className="capitalize">{s}</span>
                  {s !== 'All statuses' && (
                    <span className="text-xs text-neutral-400">{allUsers.filter((u) => u.status === s).length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Right panel */}
      <main className="flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-900 overflow-y-auto">
        <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
          </h2>
        </div>
        <div className="p-8">
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-700">
                  <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-neutral-50 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-neutral-800 dark:text-neutral-200">{user.name}</p>
                      <p className="text-xs text-neutral-400">{user.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${roleBadge[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${user.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-neutral-300'}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">{user.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
    </StoryShell>
  );
}

const meta: Meta<typeof UsersPage> = {
  title: 'Layout/Pages/Users',
  component: UsersPage,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
