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
      </div>
      <div className="flex items-center gap-6">{children}</div>
    </header>
  );
}
