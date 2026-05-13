"use client";

import { useState, useEffect, useCallback } from "react";

interface DnsRecords {
  cname_target: string;
  txt_name: string | null;
  txt_value: string | null;
  ssl_txt_name: string | null;
  ssl_txt_value: string | null;
}

type DomainStatus = "none" | "pending" | "active" | "unknown";

function StatusBadge({ status, sslStatus }: { status: DomainStatus; sslStatus?: string }) {
  if (status === "active" && sslStatus === "active") {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">✓ Active</span>;
  }
  if (status === "active" || status === "pending") {
    const label = sslStatus === "pending_validation" ? "Awaiting DNS verification" : "Provisioning SSL…";
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5">⏳ {label}</span>;
  }
  return null;
}

export default function CustomDomainForm({
  siteId,
  currentDomain,
  hasHostname,
}: {
  siteId: string;
  currentDomain: string | null;
  hasHostname: boolean;
}) {
  const [domain, setDomain] = useState(currentDomain ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecords | null>(null);
  const [domainStatus, setDomainStatus] = useState<DomainStatus>("none");
  const [sslStatus, setSslStatus] = useState<string | undefined>();

  const checkStatus = useCallback(async () => {
    const res = await fetch(`/api/domains/status?siteId=${siteId}`);
    if (!res.ok) return;
    const json = await res.json();
    setDomainStatus(json.status ?? "none");
    setSslStatus(json.ssl_status);
  }, [siteId]);

  // Poll every 10s while pending
  useEffect(() => {
    if (currentDomain && hasHostname) checkStatus();
  }, [currentDomain, hasHostname, checkStatus]);

  useEffect(() => {
    if (domainStatus !== "pending") return;
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [domainStatus, checkStatus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDnsRecords(null);
    setDomainStatus("none");

    const res = await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, domain: domain.trim() }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to save domain.");
    } else if (json.cname_target) {
      setDnsRecords({
        cname_target: json.cname_target,
        txt_name: json.txt_name,
        txt_value: json.txt_value,
        ssl_txt_name: json.ssl_txt_name ?? null,
        ssl_txt_value: json.ssl_txt_value ?? null,
      });
      setDomainStatus("pending");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="yourdomain.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
            style={{ borderColor: "var(--border)", background: "var(--background)" }}
          />
          {domainStatus !== "none" && <StatusBadge status={domainStatus} sslStatus={sslStatus} />}
        </div>
        {error && <p className="text-sm" style={{ color: "#C0392B" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !domain.trim()}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
          style={{ background: "var(--foreground)", color: "var(--card)" }}
        >
          {loading ? "Saving…" : "Save domain"}
        </button>
      </form>

      {domainStatus === "active" && sslStatus === "active" && (
        <p className="text-sm text-green-700 font-medium">Your custom domain is live! Visit <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="underline">{domain}</a></p>
      )}

      {dnsRecords && !(domainStatus === "active" && sslStatus === "active") && (
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

          {dnsRecords.ssl_txt_name && dnsRecords.ssl_txt_value &&
            dnsRecords.ssl_txt_name !== dnsRecords.txt_name && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">3. TXT record (SSL validation)</p>
              <div className="bg-white border rounded p-3 font-mono text-xs space-y-1 break-all">
                <p><span className="text-gray-500">Name:</span> {dnsRecords.ssl_txt_name}</p>
                <p><span className="text-gray-500">Value:</span> {dnsRecords.ssl_txt_value}</p>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500">Status checks automatically every 10 seconds.</p>
        </div>
      )}
    </div>
  );
}

