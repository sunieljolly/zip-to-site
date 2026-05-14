/**
 * Cloudflare Worker — Static Site Serving
 *
 * Reads hostname → looks up site in KV → fetches files from R2 → serves them.
 *
 * KV namespace: SITES_KV
 *   key: subdomain  →  value: JSON { r2_path: "sites/{uid}/{sid}" }
 *   key: custom:{domain}  →  value: same
 *
 * R2 binding: SITES_BUCKET
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // For CF for SaaS custom hostnames the request is routed through the zone's
    // fallback origin, so request.url.hostname may be the fallback origin subdomain
    // rather than the original custom domain.  The Host header always contains the
    // original hostname the visitor used, so prefer it.
    const hostname = request.headers.get("host") ?? url.hostname;

    // --- Resolve site record from KV ---
    let siteRecord = null;

    const appDomain = env.APP_DOMAIN; // e.g. yourdomain.com
    if (hostname.endsWith(`.${appDomain}`)) {
      const subdomain = hostname.slice(0, -(appDomain.length + 1));
      const value = await env.SITES_KV.get(subdomain);
      if (value) siteRecord = JSON.parse(value);
    } else {
      // custom domain lookup
      const value = await env.SITES_KV.get(`custom:${hostname}`);
      if (value) siteRecord = JSON.parse(value);
    }

    if (!siteRecord) {
      return new Response("Site not found", { status: 404 });
    }

    const { r2_path } = siteRecord;

    // --- Resolve file path ---
    let filePath = url.pathname;
    if (filePath === "/" || filePath === "") filePath = "/index.html";
    if (filePath.endsWith("/")) filePath += "index.html";

    // Prevent path traversal
    const normalized = filePath.replace(/\.\./g, "").replace(/\/+/g, "/");
    const key = `${r2_path}${normalized}`;

    // --- Fetch from R2 ---
    let object = await env.SITES_BUCKET.get(key);

    // SPA fallback
    if (!object) {
      object = await env.SITES_BUCKET.get(`${r2_path}/index.html`);
      if (!object) return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");

    // Override cache for HTML
    if (key.endsWith(".html")) {
      headers.set("cache-control", "public, max-age=0, must-revalidate");
    }

    return new Response(object.body, { headers });
  },
};
