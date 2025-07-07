import { Metadata } from "next";
import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TabLayout from "@/components/tab-layout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users - OSM for Cities",
  description: "Platform users",
};

async function getUsers() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { datasets: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users;
}

export default async function UsersPage() {
  const user = await getUserFromCookie();

  if (!user) {
    redirect("/");
  }

  if (!user.isAdmin) {
    redirect("/watched");
  }

  const users = await getUsers();

  return (
    <TabLayout activeTab="users" isAdmin={user.isAdmin}>
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Users
          </h2>
          {users.length > 0 && (
            <span className="text-sm text-gray-500">({users.length})</span>
          )}
        </div>

        {users.length === 0 ? (
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No users found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-black dark:text-white">
                      {user.name || user.email.split("@")[0]}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        user.isAdmin
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {user.isAdmin ? "Admin" : "User"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                  <span>Datasets: {user._count.datasets}</span>
                  <span>
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TabLayout>
  );
}
