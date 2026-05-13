"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteSiteButton({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this site? This cannot be undone.")) return;
    setLoading(true);
    const res = await fetch(`/api/sites/${siteId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      alert("Failed to delete site.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm px-4 py-2 rounded-lg border disabled:opacity-50 transition-colors hover:bg-red-50"
      style={{ borderColor: "#FECACA", color: "#C0392B" }}
    >
      {loading ? "Deleting…" : "Delete site"}
    </button>
  );
}
