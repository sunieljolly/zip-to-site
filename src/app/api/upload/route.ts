import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { syncSiteToKV } from "@/lib/kv";
import unzipper from "unzipper";
import { Readable } from "stream";
import mime from "mime-types";
import crypto from "crypto";
import path from "path";

const BLOCKED_EXTENSIONS = new Set([".php", ".exe", ".sh", ".py", ".rb", ".pl", ".cgi"]);
const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50 MB
const ANON_TTL_SECONDS = 600; // 10 minutes

function generateAnonSubdomain(): string {
  // ~20 random hex chars prefixed with "tmp" → e.g. tmp3a9f2c1d8b047e56a1
  return "tmp" + crypto.randomBytes(10).toString("hex");
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  if (!file.name.endsWith(".zip")) {
    return NextResponse.json({ error: "Only .zip files are accepted." }, { status: 400 });
  }

  if (file.size > MAX_ZIP_SIZE) {
    return NextResponse.json({ error: "ZIP file exceeds 50 MB limit." }, { status: 400 });
  }

  const isAnonymous = !user;

  let subdomain: string;
  let name: string;

  if (isAnonymous) {
    subdomain = generateAnonSubdomain();
    name = subdomain;
  } else {
    const rawName = (formData.get("name") as string | null)?.trim();
    if (!rawName) {
      return NextResponse.json({ error: "Missing site name." }, { status: 400 });
    }
    name = rawName;
    subdomain = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
    if (!subdomain) {
      return NextResponse.json({ error: "Invalid site name." }, { status: 400 });
    }

    // Check subdomain uniqueness for authenticated users
    const { data: existing } = await supabase
      .from("sites")
      .select("id")
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Subdomain already taken." }, { status: 409 });
    }
  }

  const siteId = crypto.randomUUID();
  const r2Prefix = isAnonymous ? `sites/anon/${siteId}` : `sites/${user!.id}/${siteId}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const readable = Readable.from(buffer);

  const uploadedFiles: string[] = [];
  let hasIndex = false;

  try {
    const directory = readable.pipe(unzipper.Parse({ forceStream: true }));

    for await (const entry of directory) {
      const filePath: string = entry.path;
      const type: string = entry.type;

      if (type !== "File") {
        entry.autodrain();
        continue;
      }

      // Strip leading directory component if present (e.g. dist/index.html → index.html)
      const normalizedPath = filePath.replace(/^[^/]+\//, "");

      const ext = path.extname(normalizedPath).toLowerCase();

      if (BLOCKED_EXTENSIONS.has(ext)) {
        entry.autodrain();
        return NextResponse.json(
          { error: `Blocked file type: ${ext}` },
          { status: 400 }
        );
      }

      if (path.basename(normalizedPath) === "package.json") {
        entry.autodrain();
        return NextResponse.json(
          { error: "Looks like a dev project (package.json found). Upload the built output instead." },
          { status: 400 }
        );
      }

      if (normalizedPath === "index.html") hasIndex = true;

      const chunks: Buffer[] = [];
      for await (const chunk of entry) {
        chunks.push(chunk as Buffer);
      }
      const content = Buffer.concat(chunks);

      const contentType = mime.lookup(normalizedPath) || "application/octet-stream";

      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: `${r2Prefix}/${normalizedPath}`,
          Body: content,
          ContentType: contentType,
        })
      );

      uploadedFiles.push(normalizedPath);
    }
  } catch {
    return NextResponse.json({ error: "Failed to process ZIP file." }, { status: 500 });
  }

  if (!hasIndex) {
    return NextResponse.json({ error: "ZIP must contain an index.html file." }, { status: 400 });
  }

  // For authenticated users, persist the site to the database
  if (!isAnonymous) {
    const { error: dbError } = await supabase.from("sites").insert({
      id: siteId,
      user_id: user!.id,
      name,
      subdomain,
      r2_path: r2Prefix,
    });

    if (dbError) {
      return NextResponse.json({ error: "Failed to save site record." }, { status: 500 });
    }
  }

  // Sync to Cloudflare KV so the Worker can serve this site.
  // Anonymous sites get a 10-minute TTL; authenticated sites are permanent.
  try {
    await syncSiteToKV({
      subdomain,
      r2Path: r2Prefix,
      ...(isAnonymous ? { ttlSeconds: ANON_TTL_SECONDS } : {}),
    });
  } catch {
    // Non-fatal — site is saved (if authenticated), KV can be synced manually
    console.error("KV sync failed for", subdomain);
  }

  const siteUrl = `https://${subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN}`;

  if (isAnonymous) {
    const expiresAt = new Date(Date.now() + ANON_TTL_SECONDS * 1000).toISOString();
    return NextResponse.json({ url: siteUrl, expiresAt, anonymous: true });
  }

  return NextResponse.json({ siteId, url: siteUrl });
}
