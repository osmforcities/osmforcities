import Link from "next/link";
import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import MonitorsList from "@/app/my-monitors/monitors-list";
import { redirect } from "next/navigation";

export default async function MyMonitors() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    redirect("/");
  }

  const session = await findSessionByToken(sessionToken);

  if (!session || session.expiresAt < new Date()) {
    redirect("/");
  }

  const user = session.user;

  const monitors = await prisma.monitor.findMany({
    where: { userId: user.id },
    include: {
      template: true,
      area: true,
      _count: {
        select: { watchers: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const monitorsWithDeleteFlag = monitors.map((monitor) => ({
    ...monitor,
    canDelete: monitor._count.watchers <= 1,
  }));

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="border-b border-black dark:border-white pb-4 mb-8">
          <h1 className="text-3xl font-bold">My Monitors</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View and manage your OpenStreetMap data monitors across different
            cities.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="border border-black dark:border-white p-6">
            <h2 className="text-xl font-semibold mb-4">Account Info</h2>
            <div className="space-y-2">
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              {user.name && (
                <p>
                  <strong>Name:</strong> {user.name}
                </p>
              )}
              <p>
                <strong>Member since:</strong>{" "}
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="border border-black dark:border-white p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Monitors</h2>
              <Link
                href="/my-monitors/create"
                className="inline-block bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-sm border-2 border-black dark:border-white hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white transition-colors"
              >
                Create New Monitor
              </Link>
            </div>
            <MonitorsList monitors={monitorsWithDeleteFlag} />
          </div>
        </div>
      </div>
    </div>
  );
}
