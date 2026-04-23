/**
 * Mock mode — set NEXT_PUBLIC_MOCK_AUTH=true in .env.local to bypass
 * Supabase auth and see the UI without any API keys configured.
 */

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

export const MOCK_USER = {
  id: "mock-user-id",
  email: "demo@example.com",
};

export const MOCK_SITES = [
  {
    id: "mock-site-1",
    name: "my-portfolio",
    subdomain: "my-portfolio",
    custom_domain: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-site-2",
    name: "landing-page",
    subdomain: "landing-page",
    custom_domain: "example.com",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];
