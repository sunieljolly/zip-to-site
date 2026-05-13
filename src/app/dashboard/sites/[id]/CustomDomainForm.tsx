"use client";

import { useState } from "react";

interface DnsRecords {
  cname_target: string;
  txt_name: string | null;
  txt_value: string | null;
}

export default function CustomDomainForm({
  siteId,
  currentDomain,
}: {
  siteId: string;
  currentDomain: string | null;
}) {
  const [domain, setDomain] = useState(currentDomain ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecords | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDnsRecords(null);

    const res = await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, domain: domain.trim() }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to save domain.");
    } else if (json.cname_target) {
      setDnsRecords({ cname_target: json.cname_target, txt_name: json.txt_name, txt_value: json.txt_value });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="yourdomain.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !domain.trim()}
          className="bg-black text-white text-sm px-4 py-2 rounded-lg disabled:opacity-40"
        >
          {loading ? "Saving…" : "Save Domain"}
        </button>
      </form>

      {dnsRecords && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-4 text-sm">
          <p className="font-semibold">Add these DNS records at your domain registrar:</p>

          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">1. CNAME record</p>
            <div className="bg-white border rounded p-3 font-mono text-xs space-y-1 break-all">
              <p><span className="text-gray-500">Name:</span> {domain}</p>
              <p><span className="text-gray-500">Value:</span> {dnsRecords.cname_target}</p>
            </div>
          </div>

          {dnsRecords.txt_name && dnsRecords.txt_value && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">2. TXT record (ownership verification)</p>
              <div className="bg-white border rounded p-3 font-mono text-xs space-y-1 break-all">
                <p><span className="text-gray-500">Name:</span> {dnsRecords.txt_name}</p>
                <p><span className="text-gray-500">Value:</span> {dnsRecords.txt_value}</p>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500">SSL will be provisioned automatically once DNS propagates (usually a few minutes).</p>
        </div>
      )}
    </div>
  );
}
  );
}
