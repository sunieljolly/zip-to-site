"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteSiteButton({ siteId, siteName }: { siteId: string; siteName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/sites/${siteId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      alert("Failed to delete site.");
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-red-50"
        style={{ borderColor: "#FECACA", color: "#C0392B" }}
      >
        Delete site
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: "var(--foreground)" }}>
        Type <span className="font-mono font-semibold">{siteName}</span> to confirm deletion:
      </p>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={siteName}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
        style={{ borderColor: "#FECACA", background: "var(--background)", color: "var(--foreground)" }}
        autoFocus
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleDelete}
          disabled={loading || input !== siteName}
          className="text-sm px-4 py-2 rounded-lg border disabled:opacity-40 transition-colors hover:bg-red-50"
          style={{ borderColor: "#FECACA", color: "#C0392B" }}
        >
          {loading ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          onClick={() => { setConfirming(false); setInput(""); }}
          className="text-sm px-4 py-2 rounded-lg border transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
