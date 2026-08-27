import { notFound } from "next/navigation";

import { ClipDetailScreen } from "@/components/detail/ClipDetailScreen";
import { getAllClips, getClipById } from "@/lib/clips";

export function generateStaticParams() {
  return getAllClips().map((clip) => ({ clipId: String(clip.id) }));
}

interface ClipPageProps {
  params: Promise<{ clipId: string }>;
}

export default async function ClipPage({ params }: ClipPageProps) {
  const { clipId } = await params;
  const clip = getClipById(Number(clipId));

  if (!clip) notFound();

  return <ClipDetailScreen clip={clip} />;
}
