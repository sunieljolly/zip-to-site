"use client";

import { useState } from "react";

export default function CustomDomainForm({
  siteId,
  currentDomain,
}: {
  siteId: string;
  currentDomain: string | null;
}) {
  const [domain, setDomain] = useState(currentDomain ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, domain: domain.trim() }),
    });

    const json = await res.json();
    setMessage(res.ok ? "Domain saved! Point your DNS CNAME to workers.dev." : json.error ?? "Failed.");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        placeholder="yourdomain.com"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
      />
      {message && <p className="text-sm text-green-600">{message}</p>}
      <button
        type="submit"
        disabled={loading || !domain.trim()}
        className="bg-black text-white text-sm px-4 py-2 rounded-lg disabled:opacity-40"
      >
        {loading ? "Saving…" : "Save Domain"}
      </button>
    </form>
  );
}
