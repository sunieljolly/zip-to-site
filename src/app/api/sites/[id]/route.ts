import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: site } = await supabase
    .from("sites")
    .select("r2_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete all R2 objects for this site
  const listed = await r2.send(
    new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: site.r2_path })
  );

  if (listed.Contents && listed.Contents.length > 0) {
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: {
          Objects: listed.Contents.map((o) => ({ Key: o.Key! })),
        },
      })
    );
  }

  await supabase.from("sites").delete().eq("id", id).eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
