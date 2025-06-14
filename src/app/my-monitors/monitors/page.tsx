import { cookies } from "next/headers";
import { findSessionByToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import CreateMonitorForm from "@/app/my-monitors/monitors/create-monitor-form";
import MonitorsList from "@/app/my-monitors/monitors/monitors-list";
import Link from "next/link";

const prisma = new PrismaClient();

async function getMonitorsData() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    redirect("/");
  }

  const session = await findSessionByToken(sessionToken);

  if (!session || session.expiresAt < new Date()) {
    redirect("/");
  }

  // Get all available templates
  const templates = await prisma.dataTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  // Get user's existing monitors
  const monitors = await prisma.cityMonitor.findMany({
    where: { userId: session.user.id },
    include: { template: true },
    orderBy: { createdAt: "desc" },
  });

  return { user: session.user, templates, monitors };
}

export default async function MonitorsPage() {
  const { user, templates, monitors } = await getMonitorsData();

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="border-b border-black pb-4 mb-8">
          <div className="flex items-center mb-2">
            <Link
              href="/my-monitors"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center mr-4"
            >
              ← Back to My Monitors
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Create New Monitor</h1>
          <p className="text-gray-600 mt-2">
            Create a new monitor by selecting a data template and city to track
            OpenStreetMap data.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create New Monitor */}
          <div className="border border-black p-6">
            <h2 className="text-xl font-semibold mb-4">Monitor Form</h2>
            <CreateMonitorForm templates={templates} userId={user.id} />
          </div>

          {/* Existing Monitors */}
          <div className="border border-black p-6">
            <h2 className="text-xl font-semibold mb-4">Your Monitors</h2>
            <MonitorsList monitors={monitors} />
          </div>
        </div>
      </div>
    </div>
  );
}
