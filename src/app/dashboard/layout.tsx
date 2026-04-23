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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-lg">
          ZipToSite
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-gray-600 hover:text-black">
            Sites
          </Link>
          <Link href="/dashboard/upload" className="text-gray-600 hover:text-black">
            Upload
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-gray-500 hover:text-black">
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
