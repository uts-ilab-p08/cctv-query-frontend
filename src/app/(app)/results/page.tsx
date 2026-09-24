import { ResultsScreen } from "@/components/results/ResultsScreen";

interface ResultsPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const { q } = await searchParams;
  return <ResultsScreen urlQuery={Array.isArray(q) ? (q[0] ?? "") : (q ?? "")} />;
}
