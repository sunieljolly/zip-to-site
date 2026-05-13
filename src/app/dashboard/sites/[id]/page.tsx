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
      <h1 className="text-2xl font-bold mb-2">{site.name}</h1>
      <a
        href={`https://${site.subdomain}.${domain}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 text-sm hover:underline"
      >
        {site.subdomain}.{domain}
      </a>

      <hr className="my-6" />

      <section className="mb-8">
        <h2 className="font-semibold mb-3">Custom Domain</h2>
        <CustomDomainForm siteId={site.id} currentDomain={site.custom_domain} hasHostname={!!site.custom_hostname_id} />
      </section>

      <hr className="my-6" />

      <section>
        <h2 className="font-semibold mb-3 text-red-600">Danger Zone</h2>
        <DeleteSiteButton siteId={site.id} />
      </section>
    </div>
  );
}
