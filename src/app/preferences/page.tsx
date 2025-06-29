import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PreferencesForm } from "./preferences-form";

export default async function PreferencesPage() {
  const user = await getUserFromCookie();

  if (!user) {
    redirect("/enter");
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Email Preferences</h1>

      <div className="space-y-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Reports</h2>
          <p className="text-gray-600 mb-4">
            Get a summary of your monitors and their activity.
          </p>

          <PreferencesForm
            initialReportsEnabled={user.reportsEnabled}
            initialReportsFrequency={user.reportsFrequency}
          />
        </div>

        <div className="border rounded-lg p-6 bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">Magic Links</h2>
          <p className="text-gray-600 mb-4">
            Magic links for signing in are always enabled and cannot be
            disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
