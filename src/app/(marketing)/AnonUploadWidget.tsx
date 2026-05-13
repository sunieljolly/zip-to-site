"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface UploadResult {
  url: string;
  expiresAt: string;
}

export default function AnonUploadWidget() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!result) return;
    const expiry = new Date(result.expiresAt).getTime();

    function tick() {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [result]);

  function formatCountdown(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".zip")) {
      setFile(dropped);
      setError(null);
    } else {
      setError("Please drop a .zip file.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected?.name.endsWith(".zip")) {
      setFile(selected);
      setError(null);
    } else {
      setError("Please select a .zip file.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Upload failed.");
      setLoading(false);
      return;
    }

    setResult({ url: json.url, expiresAt: json.expiresAt });
    setLoading(false);
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Success state
  if (result) {
    const expired = secondsLeft === 0;
    return (
      <div className="rounded-2xl border p-8 space-y-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex flex-col items-center text-center space-y-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1"
            style={{ background: expired ? "var(--border)" : "#D1FAE5" }}
          >
            {expired ? "⏱" : "✓"}
          </div>
          <p className="font-semibold text-base">
            {expired ? "Link expired" : "Your site is live!"}
          </p>
          {!expired && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Expires in{" "}
              <span className="font-mono font-semibold" style={{ color: "var(--foreground)" }}>
                {secondsLeft !== null ? formatCountdown(secondsLeft) : "…"}
              </span>
            </p>
          )}
        </div>

        {!expired && (
          <div
            className="flex items-center gap-2 rounded-xl border px-4 py-3"
            style={{ borderColor: "var(--border)", background: "var(--background)" }}
          >
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm font-mono truncate hover:underline"
              style={{ color: "var(--foreground)" }}
            >
              {result.url}
            </a>
            <button
              onClick={handleCopy}
              className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ background: "var(--border)", color: "var(--foreground)" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        <div
          className="rounded-xl border p-4 space-y-3"
          style={{ borderColor: "var(--border)", background: "var(--background)" }}
        >
          <p className="text-sm font-medium">Want to keep it permanently?</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Sign up for a free account to save your site with a custom subdomain and no expiry.
          </p>
          <div className="flex gap-2">
            <Link
              href="/signup"
              className="inline-block text-xs font-semibold rounded-lg px-4 py-2 transition-opacity hover:opacity-80"
              style={{ background: "var(--foreground)", color: "var(--card)" }}
            >
              Sign up free →
            </Link>
            <button
              onClick={() => { setResult(null); setFile(null); setSecondsLeft(null); }}
              className="inline-block text-xs font-medium rounded-lg px-4 py-2 transition-opacity hover:opacity-70"
              style={{ background: "var(--border)", color: "var(--foreground)" }}
            >
              Upload another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Upload form
  return (
    <div className="rounded-2xl border p-8" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all select-none"
          style={{
            borderColor: dragging ? "var(--foreground)" : "var(--border)",
            background: dragging ? "var(--border)" : "transparent",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleFileChange}
          />
          {file ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB — click to change
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-2xl">📦</p>
              <p className="text-sm font-medium">Drop your ZIP here</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                or click to browse · max 50 MB
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm rounded-lg px-4 py-2.5" style={{ background: "#FEE2E2", color: "#991B1B" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full text-sm font-semibold rounded-xl py-3 transition-opacity disabled:opacity-40"
          style={{ background: "var(--foreground)", color: "var(--card)" }}
        >
          {loading ? "Deploying…" : "Deploy now — no sign up required"}
        </button>

        <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
          Your site will be live for{" "}
          <span className="font-semibold" style={{ color: "var(--foreground)" }}>10 minutes</span>.{" "}
          <Link href="/signup" className="underline hover:no-underline">
            Sign up
          </Link>{" "}
          to keep it permanently.
        </p>
      </form>
    </div>
  );
}
