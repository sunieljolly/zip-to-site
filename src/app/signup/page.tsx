"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">ZipToSite</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Create your account</p>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted)" }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
                style={{ borderColor: "var(--border)", background: "var(--background)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted)" }}>Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
                style={{ borderColor: "var(--border)", background: "var(--background)" }}
              />
              <p className="text-xs mt-1.5" style={{ color: "var(--muted-light)" }}>Minimum 8 characters</p>
            </div>
            {error && <p className="text-sm" style={{ color: "#C0392B" }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-80"
              style={{ background: "var(--foreground)", color: "var(--card)" }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: "var(--muted)" }}>
          Have an account?{" "}
          <Link href="/login" className="underline" style={{ color: "var(--foreground)" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
