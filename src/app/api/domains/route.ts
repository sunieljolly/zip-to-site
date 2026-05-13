import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncSiteToKV } from "@/lib/kv";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { siteId, domain } = body as { siteId?: string; domain?: string };

  if (!siteId || !domain) {
    return NextResponse.json({ error: "Missing siteId or domain." }, { status: 400 });
  }

  // Basic domain validation
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return NextResponse.json({ error: "Invalid domain format." }, { status: 400 });
  }

  // Confirm site belongs to user
  const { data: site } = await supabase
    .from("sites")
    .select("id, subdomain, r2_path")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .single();

  if (!site) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  const { error } = await supabase
    .from("sites")
    .update({ custom_domain: domain })
    .eq("id", siteId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await syncSiteToKV({
    subdomain: site.subdomain,
    customDomain: domain,
    r2Path: site.r2_path,
  });

  return NextResponse.json({ success: true });
}
