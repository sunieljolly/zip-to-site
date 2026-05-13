import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import DeleteSiteButton from "./DeleteSiteButton";
import CustomDomainForm from "./CustomDomainForm";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!site) notFound();

  const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN;

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm mb-4" style={{ color: "var(--muted)" }}>
          <a href="/dashboard" className="hover:underline">Sites</a>
          <span>/</span>
          <span>{site.name}</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{site.name}</h1>
        <a
          href={`https://${site.subdomain}.${domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm hover:underline mt-1 inline-block"
          style={{ color: "var(--muted)" }}
        >
          {site.subdomain}.{domain} ↗
        </a>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border p-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h2 className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: "var(--muted)" }}>Custom Domain</h2>
          <CustomDomainForm siteId={site.id} currentDomain={site.custom_domain} hasHostname={!!site.custom_hostname_id} />
        </div>

        <div className="rounded-2xl border p-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h2 className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "#C0392B" }}>Danger Zone</h2>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>This will permanently delete the site and all its files.</p>
          <DeleteSiteButton siteId={site.id} />
        </div>
      </div>
    </div>
  );
}
