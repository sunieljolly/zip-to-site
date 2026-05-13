import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-5"
          style={{ color: "var(--muted)" }}
        >
          Zero config. Instant deploy.
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-6">
          Share your AI&#8209;generated<br />websites with the world
        </h1>
        <p className="text-lg max-w-xl mx-auto mb-10" style={{ color: "var(--muted)" }}>
          Upload a ZIP file exported from any AI tool — v0, Bolt, Lovable, Cursor — and get
          a live URL in seconds. No servers, no pipelines.
        </p>
        <Link
          href="/signup"
          className="inline-block text-sm font-semibold rounded-lg px-6 py-3 transition-opacity hover:opacity-80"
          style={{ background: "var(--foreground)", color: "var(--card)" }}
        >
          Deploy your first site →
        </Link>
      </section>

      {/* How it works */}
      <section style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-6 py-20">
          <p
            className="text-xs font-semibold tracking-widest uppercase text-center mb-14"
            style={{ color: "var(--muted)" }}
          >
            How it works
          </p>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              {
                step: "1",
                title: "Export your project",
                body: "Build your site with any AI tool — v0, Bolt, Lovable, Cursor. Export or download the source files as a ZIP.",
              },
              {
                step: "2",
                title: "Upload the ZIP",
                body: "Drag and drop your ZIP into the dashboard. We unpack it and push it to our global CDN instantly.",
              },
              {
                step: "3",
                title: "Share your URL",
                body: "Your site is live at a subdomain instantly. Optionally connect your own domain with one DNS record.",
              },
            ].map(({ step, title, body }) => (
              <div key={step}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-4"
                  style={{ background: "var(--border)", color: "var(--foreground)" }}
                >
                  {step}
                </div>
                <h3 className="font-semibold mb-2 text-base">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold tracking-widest uppercase text-center mb-14" style={{ color: "var(--muted)" }}>
            ZIP file requirements
          </p>
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <p className="text-sm font-semibold text-green-700">✓ What to include</p>
              <ul className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
                {[
                  "An index.html at the root of the ZIP",
                  "Static assets — CSS, JS, images, fonts",
                  "Any subfolder structure your HTML links to",
                  "Built/exported output (not source files)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-green-600">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <p className="text-sm font-semibold" style={{ color: "#C0392B" }}>✗ What not to include</p>
              <ul className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
                {[
                  "node_modules or any package directories",
                  "Server-side code (Node.js, Python, PHP…)",
                  "Build tools or config files (vite.config, webpack…)",
                  "Secrets, .env files, or API keys",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0" style={{ color: "#C0392B" }}>·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-center text-sm mt-10" style={{ color: "var(--muted)" }}>
            ZipToSite serves <strong>static files only</strong>. If your AI tool has a "Export" or "Download" button, use that output directly.
          </p>
        </div>
      </section>

      {/* CTA strip */}
      <section style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-semibold text-lg mb-1">Ready to go live?</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Free to start. No credit card required.
            </p>
          </div>
          <Link
            href="/signup"
            className="text-sm font-semibold rounded-lg px-6 py-3 transition-opacity hover:opacity-80 whitespace-nowrap"
            style={{ background: "var(--foreground)", color: "var(--card)" }}
          >
            Create your account →
          </Link>
        </div>
      </section>
    </>
  );
}


