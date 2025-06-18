"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMonitorActions } from "@/hooks/useMonitorsActions";

import { Monitor, DataTemplate, Area } from "@prisma/client";

type MonitorWithTemplateAndArea = Monitor & {
  template: DataTemplate;
  area: Area;
};

type MonitorsListProps = {
  monitors: MonitorWithTemplateAndArea[];
};

export default function MonitorsList({ monitors }: MonitorsListProps) {
  const { deletingId, handleDelete, toggleActive, togglePublic } =
    useMonitorActions();
  const neverText = "Never";

  if (monitors.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No monitors created yet.</p>
        <p className="text-sm mt-2">
          Click the "Create New Monitor" button to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {monitors.map((monitor) => (
        <div key={monitor.id} className="border border-gray-300 p-4 rounded">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold">
                {monitor.template.name} in {monitor.cityName}
                {monitor.area.countryCode && ` (${monitor.area.countryCode})`}
              </h3>
              <p className="text-sm text-gray-600 capitalize">
                Category: {monitor.template.category}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 text-xs rounded ${
                  monitor.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {monitor.isActive ? "Active" : "Inactive"}
              </span>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  monitor.isPublic
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {monitor.isPublic ? "Public" : "Private"}
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-3">
            <p>Data count: {monitor.dataCount}</p>
            <p>
              Last checked:{" "}
              {monitor.lastChecked
                ? new Date(monitor.lastChecked).toLocaleDateString()
                : neverText}
            </p>
            <p>Created: {new Date(monitor.createdAt).toLocaleDateString()}</p>
          </div>

          <div className="flex space-x-2">
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/monitor/${monitor.id}`}>View</Link>
            </Button>
            <button
              onClick={() => toggleActive(monitor.id, monitor.isActive)}
              className="px-3 py-1 text-sm border border-black hover:bg-black hover:text-white transition-colors"
            >
              {monitor.isActive ? "Deactivate" : "Activate"}
            </button>
            <button
              onClick={() => togglePublic(monitor.id, monitor.isPublic)}
              className="px-3 py-1 text-sm border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors"
            >
              {monitor.isPublic ? "Make Private" : "Make Public"}
            </button>
            <button
              onClick={() => handleDelete(monitor.id)}
              disabled={deletingId === monitor.id}
              className="px-3 py-1 text-sm border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
            >
              {deletingId === monitor.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
