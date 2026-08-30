import { Skeleton } from "@/components/ui/skeleton";
import DashboardHeader from "@/components/layout/dashboard-header";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader>
        <Skeleton className="size-9 rounded-sm" />
        <Skeleton className="size-9 rounded-sm" />
        <Skeleton className="size-9 rounded-full" />
      </DashboardHeader>

      <div className="flex flex-1">
        {/* Sidebar skeleton — mirrors Sidebar's fixed w-64 layout so there's
            no shift once the real sidebar mounts with workspace data. */}
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col gap-8 border-r border-sidebar-border bg-sidebar px-4 py-6 pt-24 md:flex">
          <div className="flex items-center gap-3 px-2">
            <Skeleton className="size-10 rounded-sm" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-sm" />
            ))}
          </div>
        </aside>

        {/* Main content skeleton */}
        <main className="flex-1 md:ml-64">
          <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 md:px-8">
            <header className="mb-20">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-12 w-72 md:h-14" />
                <Skeleton className="h-9 w-32 rounded-sm" />
              </div>
              <Skeleton className="h-5 w-96 max-w-full" />
            </header>

            <section>
              <div className="mb-8 flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-9 w-full rounded-sm sm:w-56" />
              </div>

              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-5 rounded-sm bg-muted/40 p-5"
                  >
                    <Skeleton className="size-12 shrink-0 rounded-sm" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3.5 w-1/5" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
