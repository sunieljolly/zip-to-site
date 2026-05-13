import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncSiteToKV, deleteKVKey } from "@/lib/kv";

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
    .select("id, subdomain, r2_path, custom_hostname_id")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .single();

  if (!site) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  // Register custom hostname with Cloudflare for SaaS (SSL + routing)
  let hostnameId: string | null = null;
  let cnameTarget: string | null = null;
  let txtName: string | null = null;
  let txtValue: string | null = null;
  let dcvCnameName: string | null = null;
  let dcvCnameTarget: string | null = null;

  const zoneId = process.env.CF_ZONE_ID;
  const apiToken = process.env.CF_API_TOKEN;
  const fallbackOrigin = process.env.NEXT_PUBLIC_FALLBACK_ORIGIN;

  if (zoneId && apiToken && fallbackOrigin) {
    // Delete previous custom hostname if domain is being changed
    if (site.custom_hostname_id) {
      await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${site.custom_hostname_id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${apiToken}` } }
      );
    }

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostname: domain,
          ssl: { method: "cname", type: "dv", settings: { min_tls_version: "1.2" } },
        }),
      }
    );

    let cfData: {
      success: boolean;
      errors?: { code: number; message: string }[];
      result?: {
        id: string;
        ownership_verification?: { name: string; value: string };
        ssl?: {
          status: string;
          validation_records?: Array<{ txt_name: string; txt_value: string }>;
          dcv_delegation_records?: Array<{ cname: string; cname_target: string }>;
        };
      };
    };

    try {
      cfData = await cfRes.json();
    } catch {
      console.error("CF non-JSON response, status:", cfRes.status);
      return NextResponse.json({ error: `Cloudflare returned an unexpected response (HTTP ${cfRes.status}).` }, { status: 500 });
    }

    console.log("CF custom hostname response:", cfRes.status, JSON.stringify(cfData));

    if (cfData.success && cfData.result) {
      hostnameId = cfData.result.id;
      cnameTarget = fallbackOrigin;
      txtName = cfData.result.ownership_verification?.name ?? null;
      txtValue = cfData.result.ownership_verification?.value ?? null;
      // Prefer DCV delegation CNAME; fall back to validation_records TXT
      dcvCnameName = cfData.result.ssl?.dcv_delegation_records?.[0]?.cname
        ?? cfData.result.ssl?.validation_records?.[0]?.txt_name
        ?? null;
      dcvCnameTarget = cfData.result.ssl?.dcv_delegation_records?.[0]?.cname_target
        ?? cfData.result.ssl?.validation_records?.[0]?.txt_value
        ?? null;
    } else {
      const firstError = cfData.errors?.[0];
      const msg = firstError ? `${firstError.message} (code ${firstError.code})` : `HTTP ${cfRes.status}`;
      console.error("CF custom hostname error:", JSON.stringify(cfData));
      return NextResponse.json({ error: `Cloudflare error: ${msg}` }, { status: 500 });
    }
  }

  const { error } = await supabase
    .from("sites")
    .update({ custom_domain: domain, custom_hostname_id: hostnameId })
    .eq("id", siteId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await syncSiteToKV({
    subdomain: site.subdomain,
    customDomain: domain,
    r2Path: site.r2_path,
  });

  return NextResponse.json({
    success: true,
    cname_target: cnameTarget,
    txt_name: txtName,
    txt_value: txtValue,
    dcv_cname_name: dcvCnameName,
    dcv_cname_target: dcvCnameTarget,
  });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "Missing siteId" }, { status: 400 });

  const { data: site } = await supabase
    .from("sites")
    .select("id, subdomain, r2_path, custom_domain, custom_hostname_id")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .single();

  if (!site) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  const zoneId = process.env.CF_ZONE_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (zoneId && apiToken && site.custom_hostname_id) {
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${site.custom_hostname_id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${apiToken}` } }
    );
  }

  if (site.custom_domain) {
    await deleteKVKey(`custom:${site.custom_domain}`);
  }

  const { error } = await supabase
    .from("sites")
    .update({ custom_domain: null, custom_hostname_id: null })
    .eq("id", siteId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
