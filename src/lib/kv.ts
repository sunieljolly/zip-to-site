/**
 * Writes a site record to Cloudflare KV so the Worker can serve it.
 * Called after a successful upload.
 */
export async function syncSiteToKV({
  subdomain,
  customDomain,
  r2Path,
  ttlSeconds,
}: {
  subdomain: string;
  customDomain?: string | null;
  r2Path: string;
  /** If set, the KV entry will expire after this many seconds. */
  ttlSeconds?: number;
}) {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const namespaceId = process.env.CF_KV_NAMESPACE_ID!;
  const apiToken = process.env.CF_API_TOKEN!;

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values`;
  const value = JSON.stringify({ r2_path: r2Path });

  const keys = [subdomain];
  if (customDomain) keys.push(`custom:${customDomain}`);

  const ttlQuery = ttlSeconds ? `?expiration_ttl=${ttlSeconds}` : "";

  await Promise.all(
    keys.map((key) =>
      fetch(`${baseUrl}/${encodeURIComponent(key)}${ttlQuery}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "text/plain",
        },
        body: value,
      })
    )
  );
}

export async function deleteKVKey(key: string) {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const namespaceId = process.env.CF_KV_NAMESPACE_ID!;
  const apiToken = process.env.CF_API_TOKEN!;
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${apiToken}` } }
  );
}
