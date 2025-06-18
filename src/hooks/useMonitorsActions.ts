import { useState } from "react";

export function useMonitorActions() {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (monitorId: string): Promise<void> => {
    if (!confirm("Are you sure you want to delete this monitor?")) return;

    setDeletingId(monitorId);
    try {
      const response = await fetch(`/api/monitors/${monitorId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete monitor");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Failed to delete monitor");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleField = async (
    monitorId: string,
    field: "isActive" | "isPublic",
    currentValue: boolean
  ): Promise<void> => {
    try {
      const response = await fetch(`/api/monitors/${monitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !currentValue }),
      });
      if (!response.ok) throw new Error("Failed to update monitor");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Failed to update monitor");
    }
  };

  return {
    deletingId,
    handleDelete,
    toggleActive: (id: string, value: boolean) =>
      toggleField(id, "isActive", value),
    togglePublic: (id: string, value: boolean) =>
      toggleField(id, "isPublic", value),
  };
}
