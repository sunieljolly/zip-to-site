import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MOCK_MODE } from "@/lib/mock";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!MOCK_MODE) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <nav className="border-b px-6 py-4 flex items-center justify-between" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <Link href="/dashboard" className="font-semibold text-base tracking-tight" style={{ color: "var(--foreground)" }}>
          ZipToSite
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="hover:opacity-70 transition-opacity" style={{ color: "var(--muted)" }}>
            Sites
          </Link>
          <Link href="/dashboard/upload" className="hover:opacity-70 transition-opacity" style={{ color: "var(--muted)" }}>
            Upload
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="hover:opacity-70 transition-opacity" style={{ color: "var(--muted)" }}>
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
