import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MOCK_MODE, MOCK_SITES } from "@/lib/mock";

type Site = {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  created_at: string;
};

export default async function DashboardPage() {
  let sites: Site[] = [];

  if (MOCK_MODE) {
    sites = MOCK_SITES;
  } else {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data } = await supabase
      .from("sites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    sites = (data as Site[]) ?? [];
  }

  const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "yourdomain.com";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Your Sites</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{sites.length} site{sites.length !== 1 ? "s" : ""} deployed</p>
        </div>
        <Link
          href="/dashboard/upload"
          className="text-sm px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
          style={{ background: "var(--foreground)", color: "var(--card)" }}
        >
          Upload site
        </Link>
      </div>

      {!sites || sites.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-20 text-center" style={{ borderColor: "var(--border)" }}>
          <div className="text-4xl mb-4">⚡</div>
          <p className="font-medium mb-1">No sites yet</p>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Upload a ZIP file to deploy your first site</p>
          <Link
            href="/dashboard/upload"
            className="text-sm px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--foreground)", color: "var(--card)" }}
          >
            Upload your first site
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {(sites as Site[]).map((site) => (
            <div
              key={site.id}
              className="rounded-xl border p-5 flex items-center justify-between transition-shadow hover:shadow-sm"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">{site.name}</p>
                <a
                  href={`https://${site.subdomain}.${domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:underline mt-0.5 block"
                  style={{ color: "var(--muted)" }}
                >
                  {site.subdomain}.{domain}
                </a>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <a
                  href={`https://${site.subdomain}.${domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs border rounded-lg px-3 py-1.5 transition-colors hover:bg-stone-50 font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  Visit ↗
                </a>
                <Link
                  href={`/dashboard/sites/${site.id}`}
                  className="text-xs border rounded-lg px-3 py-1.5 transition-colors hover:bg-stone-50 font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
