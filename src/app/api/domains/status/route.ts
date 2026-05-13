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
    result?: {
      status: string;
      ownership_verification?: { name: string; value: string };
      ssl?: {
        status: string;
        validation_records?: Array<{ txt_name: string; txt_value: string }>;
        dcv_delegation_records?: Array<{ cname: string; cname_target: string }>;
      };
    };
  };

  if (!cfData.success || !cfData.result) return NextResponse.json({ status: "unknown" });

  const hostnameStatus = cfData.result.status;
  const sslStatus = cfData.result.ssl?.status;
  const fallbackOrigin = process.env.NEXT_PUBLIC_FALLBACK_ORIGIN ?? null;
  const ssl = cfData.result.ssl;

  // Use DCV delegation CNAME if present, otherwise fall back to TXT validation_records
  const dcvCnameName = ssl?.dcv_delegation_records?.[0]?.cname
    ?? ssl?.validation_records?.[0]?.txt_name
    ?? null;
  const dcvCnameTarget = ssl?.dcv_delegation_records?.[0]?.cname_target
    ?? ssl?.validation_records?.[0]?.txt_value
    ?? null;
  const isDcvCname = !!(ssl?.dcv_delegation_records?.[0]);

  return NextResponse.json({
    status: hostnameStatus,
    ssl_status: sslStatus,
    cname_target: fallbackOrigin,
    txt_name: cfData.result.ownership_verification?.name ?? null,
    txt_value: cfData.result.ownership_verification?.value ?? null,
    dcv_cname_name: dcvCnameName,
    dcv_cname_target: dcvCnameTarget,
    dcv_is_cname: isDcvCname,
  });
}
