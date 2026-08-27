import { QueryComposer } from "@/components/dashboard/QueryComposer";
import { RecentQueries } from "@/components/dashboard/RecentQueries";

export default function DashboardPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-1 flex-col items-center justify-center px-8 pt-10 pb-15">
      <div className="flex w-full max-w-[680px] flex-col items-center">
        <QueryComposer />
        <RecentQueries />
      </div>
    </div>
  );
}
