import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-base">
            ZipToSite
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium rounded-lg px-4 py-2 transition-opacity hover:opacity-80"
                style={{ background: "var(--foreground)", color: "var(--card)" }}
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm transition-opacity hover:opacity-60"
                  style={{ color: "var(--muted)" }}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="text-sm font-medium rounded-lg px-4 py-2 transition-opacity hover:opacity-80"
                  style={{ background: "var(--foreground)", color: "var(--card)" }}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div
          className="max-w-4xl mx-auto px-6 py-6 text-xs text-center"
          style={{ color: "var(--muted-light)" }}
        >
          © {new Date().getFullYear()} ZipToSite
        </div>
      </footer>
    </div>
  );
}
