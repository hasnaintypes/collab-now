import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Loader({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-[50vh] items-center justify-center", className)}>
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
