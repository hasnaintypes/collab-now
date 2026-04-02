import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DashboardHeader({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex items-center justify-between bg-background/80 px-8 h-16 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-none",
        className
      )}
    >
      <div className="flex items-center gap-12">
        <Link
          href="/dashboard"
          className="text-xl font-bold tracking-tighter"
        >
          CollabNow
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium tracking-tight md:flex">
          <Link
            href="/dashboard"
            className="border-b border-foreground pb-1 text-foreground"
          >
            Documents
          </Link>
          <Link
            href="/dashboard?filter=shared"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Shared
          </Link>
          <Link
            href="/dashboard?filter=recent"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Archive
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-6">{children}</div>
    </header>
  );
}
