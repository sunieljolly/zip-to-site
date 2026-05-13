import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "Missing siteId" }, { status: 400 });

  const { data: site } = await supabase
    .from("sites")
    .select("custom_hostname_id, custom_domain")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .single();

  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  if (!site.custom_hostname_id) return NextResponse.json({ status: "none" });

  const zoneId = process.env.CF_ZONE_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (!zoneId || !apiToken) return NextResponse.json({ status: "unknown" });

  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${site.custom_hostname_id}`,
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );

  const cfData = await cfRes.json() as {
    success: boolean;
    result?: { status: string; ssl?: { status: string } };
  };

  if (!cfData.success || !cfData.result) return NextResponse.json({ status: "unknown" });

  const hostnameStatus = cfData.result.status; // pending, active, deleted, etc.
  const sslStatus = cfData.result.ssl?.status; // pending_validation, pending_issuance, active, etc.

  return NextResponse.json({ status: hostnameStatus, ssl_status: sslStatus });
}
