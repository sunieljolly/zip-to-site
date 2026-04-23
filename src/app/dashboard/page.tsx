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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Sites</h1>
        <Link
          href="/dashboard/upload"
          className="bg-black text-white text-sm px-4 py-2 rounded-lg"
        >
          + Upload Site
        </Link>
      </div>

      {!sites || sites.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No sites yet.</p>
          <Link
            href="/dashboard/upload"
            className="mt-4 inline-block bg-black text-white text-sm px-4 py-2 rounded-lg"
          >
            Upload your first site
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {(sites as Site[]).map((site) => (
            <div
              key={site.id}
              className="bg-white border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{site.name}</p>
                <a
                  href={`https://${site.subdomain}.${domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {site.subdomain}.{domain}
                </a>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/sites/${site.id}`}
                  className="text-sm border rounded-lg px-3 py-1 hover:bg-gray-50"
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
