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


