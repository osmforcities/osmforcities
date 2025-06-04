import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

async function getDashboardData() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    redirect("/");
  }

  const session = await findSessionByToken(sessionToken);

  if (!session || session.expiresAt < new Date()) {
    redirect("/");
  }

  return { user: session.user };
}

export default async function Dashboard() {
  const { user } = await getDashboardData();

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="border-b border-black dark:border-white pb-4 mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>

        <div className="space-y-6">
          <div className="border border-black dark:border-white p-6">
            <h2 className="text-xl font-semibold mb-4">Welcome back!</h2>
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

          {/* New City Data Monitors Section */}
          <div className="border border-black dark:border-white p-6">
            <h2 className="text-xl font-semibold mb-4">City Data Monitors</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Monitor OpenStreetMap data across different cities. Create
              monitors for datasets like bicycle parking, bus stops, hospitals,
              and more.
            </p>
            <Link
              href="/dashboard/monitors"
              className="inline-block bg-black dark:bg-white text-white dark:text-black px-6 py-3 border-2 border-black dark:border-white hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white transition-colors"
            >
              Manage Monitors
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
