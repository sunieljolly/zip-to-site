"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [siteName, setSiteName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".zip")) setFile(dropped);
    else setError("Please upload a .zip file.");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected?.name.endsWith(".zip")) {
      setFile(selected);
      setError(null);
    } else {
      setError("Please upload a .zip file.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !siteName.trim()) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", siteName.trim());

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Upload failed.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Upload Site</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Deploy a static site from a ZIP file</p>
      </div>

      <div className="rounded-2xl border p-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted)" }}>Site name</label>
            <input
              type="text"
              required
              placeholder="my-portfolio"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
              style={{ borderColor: "var(--border)", background: "var(--background)" }}
            />
            <p className="text-xs mt-1.5" style={{ color: "var(--muted-light)" }}>Becomes your subdomain slug</p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted)" }}>ZIP file</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all"
              style={{
                borderColor: dragging ? "var(--foreground)" : "var(--border)",
                background: dragging ? "#F0EFE9" : "var(--background)",
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
                <div>
                  <div className="text-2xl mb-2">📦</div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <div className="text-2xl mb-2">↑</div>
                  <p className="text-sm font-medium">Drop your ZIP file here</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>or click to browse · max 50 MB</p>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: "#C0392B" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !file || !siteName.trim()}
            className="w-full rounded-lg py-2.5 text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
            style={{ background: "var(--foreground)", color: "var(--card)" }}
          >
            {loading ? "Deploying…" : "Deploy site"}
          </button>
        </form>
      </div>
    </div>
  );
}
