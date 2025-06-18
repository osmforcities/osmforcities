import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default async function PublicMonitorsFeed() {
  const monitors = await prisma.monitor.findMany({
    where: { isPublic: true },
    include: {
      template: true,
      user: true,
      area: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (monitors.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="border border-black p-4 text-center">
          <p className="text-gray-600">No public monitors yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="border border-black">
        <div className="border-b border-black p-4 bg-gray-50">
          <h2 className="text-xl font-bold">Public City Data Monitors</h2>
          <p className="text-sm text-gray-600 mt-1">
            Discover what datasets others are monitoring across different cities
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {monitors.map((monitor) => (
            <div key={monitor.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">
                    {monitor.template.name} in {monitor.cityName}
                    {monitor.area.countryCode &&
                      ` (${monitor.area.countryCode})`}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {monitor.template.description}
                  </p>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">
                  {monitor.template.category}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex space-x-4">
                  <span>Data count: {monitor.dataCount}</span>
                  <span>
                    Last checked:{" "}
                    {monitor.lastChecked
                      ? new Date(monitor.lastChecked).toLocaleDateString()
                      : "Never"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p>
                      By {monitor.user.name || monitor.user.email.split("@")[0]}
                    </p>
                    <p className="text-xs">
                      {new Date(monitor.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/monitor/${monitor.id}`}>View Monitor</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
