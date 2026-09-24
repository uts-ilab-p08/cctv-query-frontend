import { notFound } from "next/navigation";

import { ClipDetailScreen } from "@/components/detail/ClipDetailScreen";
import { ApiError } from "@/lib/api/client";
import { getClipById } from "@/lib/api/endpoints";
import { createClient } from "@/lib/supabase/server";

interface ClipPageProps {
  params: Promise<{ clipId: string }>;
}

export default async function ClipPage({ params }: ClipPageProps) {
  const { clipId } = await params;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const clip = await getClipById(clipId, session?.access_token ?? null).catch((error) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });

  if (!clip) notFound();

  return <ClipDetailScreen clip={clip} />;
}
