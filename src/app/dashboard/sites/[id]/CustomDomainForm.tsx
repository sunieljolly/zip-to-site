"use client";

import { useState, useEffect, useCallback } from "react";

interface DnsRecords {
  cname_target: string | null;
  txt_name: string | null;
  txt_value: string | null;
  dcv_cname_name: string | null;
  dcv_cname_target: string | null;
  dcv_is_cname: boolean;
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
  const [disconnecting, setDisconnecting] = useState(false);
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
    // Persist DNS records from every status response
    if (json.cname_target || json.txt_name || json.dcv_cname_name) {
      setDnsRecords({
        cname_target: json.cname_target ?? null,
        txt_name: json.txt_name ?? null,
        txt_value: json.txt_value ?? null,
        dcv_cname_name: json.dcv_cname_name ?? null,
        dcv_cname_target: json.dcv_cname_target ?? null,
        dcv_is_cname: json.dcv_is_cname ?? false,
      });
    }
  }, [siteId]);

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
        txt_name: json.txt_name ?? null,
        txt_value: json.txt_value ?? null,
        dcv_cname_name: json.dcv_cname_name ?? null,
        dcv_cname_target: json.dcv_cname_target ?? null,
        dcv_is_cname: json.dcv_is_cname ?? false,
      });
      setDomainStatus("pending");
    }
    setLoading(false);
  }

  async function handleDisconnect() {
    if (!confirm("Remove this custom domain? Your site will still be available at its subdomain.")) return;
    setDisconnecting(true);
    const res = await fetch(`/api/domains?siteId=${siteId}`, { method: "DELETE" });
    if (res.ok) {
      setDomain("");
      setDnsRecords(null);
      setDomainStatus("none");
      setSslStatus(undefined);
    } else {
      alert("Failed to disconnect domain.");
    }
    setDisconnecting(false);
  }

  const isFullyActive = domainStatus === "active" && sslStatus === "active";
  const hasDomain = domain.trim().length > 0 && (hasHostname || domainStatus !== "none");
  const isConnected = hasHostname || domainStatus !== "none";

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="yourdomain.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            readOnly={isConnected}
            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-shadow"
            style={{
              borderColor: "var(--border)",
              background: isConnected ? "var(--border)" : "var(--background)",
              color: isConnected ? "var(--muted)" : "var(--foreground)",
              cursor: isConnected ? "default" : "text",
            }}
          />
          {domainStatus !== "none" && <StatusBadge status={domainStatus} sslStatus={sslStatus} />}
        </div>
        {error && <p className="text-sm" style={{ color: "#C0392B" }}>{error}</p>}
        <div className="flex items-center gap-3">
          {!isConnected && (
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
              style={{ background: "var(--foreground)", color: "var(--card)" }}
            >
              {loading ? "Saving…" : "Save domain"}
            </button>
          )}
          {hasDomain && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-red-50 disabled:opacity-50"
              style={{ borderColor: "#FECACA", color: "#C0392B" }}
            >
              {disconnecting ? "Removing…" : "Disconnect"}
            </button>
          )}
        </div>
      </form>

      {isFullyActive && (
        <p className="text-sm text-green-700 font-medium">
          Your custom domain is live! Visit{" "}
          <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="underline">
            {domain}
          </a>
        </p>
      )}

      {dnsRecords && !isFullyActive && (
        <div className="border rounded-xl p-4 space-y-4 text-sm" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
          <p className="font-semibold">Add these DNS records at your registrar:</p>

          {dnsRecords.cname_target && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>1. CNAME — point your domain here</p>
              <div className="rounded-lg border p-3 font-mono text-xs space-y-1 break-all" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <p><span style={{ color: "var(--muted)" }}>Name:</span> {domain}</p>
                <p><span style={{ color: "var(--muted)" }}>Value:</span> {dnsRecords.cname_target}</p>
              </div>
            </div>
          )}

          {dnsRecords.txt_name && dnsRecords.txt_value && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>2. TXT — ownership verification</p>
              <div className="rounded-lg border p-3 font-mono text-xs space-y-1 break-all" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <p><span style={{ color: "var(--muted)" }}>Name:</span> {dnsRecords.txt_name}</p>
                <p><span style={{ color: "var(--muted)" }}>Value:</span> {dnsRecords.txt_value}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              {dnsRecords.txt_name ? "3." : "2."}{" "}
              {dnsRecords.dcv_is_cname ? "CNAME — SSL certificate validation (DCV delegation)" : "TXT — SSL certificate validation"}
            </p>
            {dnsRecords.dcv_cname_name && dnsRecords.dcv_cname_target ? (
              <div className="rounded-lg border p-3 font-mono text-xs space-y-1 break-all" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <p><span style={{ color: "var(--muted)" }}>Type:</span> {dnsRecords.dcv_is_cname ? "CNAME" : "TXT"}</p>
                <p><span style={{ color: "var(--muted)" }}>Name:</span> {dnsRecords.dcv_cname_name}</p>
                <p><span style={{ color: "var(--muted)" }}>Value:</span> {dnsRecords.dcv_cname_target}</p>
              </div>
            ) : (
              <div className="rounded-lg border p-3 text-xs flex items-center gap-2" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }}>
                <svg className="animate-spin shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Generating validation record… this usually takes a few seconds.
              </div>
            )}
          </div>

          <p className="text-xs" style={{ color: "var(--muted-light)" }}>Status checks automatically every 10 seconds.</p>
        </div>
      )}
    </div>
  );
}

