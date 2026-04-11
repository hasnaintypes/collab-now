"use client";

export default function DocumentFooter({
  currentUserType,
  wordCount,
}: {
  currentUserType: UserType;
  wordCount: number;
}) {
  return (
    <footer className="fixed bottom-0 w-full z-40 flex items-center justify-between px-8 py-3 bg-background border-t border-border/30 text-[11px] tracking-wide">
      <div className="flex items-center gap-6">
        <span className="text-foreground">
          {currentUserType === "editor" ? "Editing" : "Viewing"}
        </span>
        <span className="text-muted-foreground">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
        <span className="text-muted-foreground">
          ~{Math.max(1, Math.round(wordCount / 200))}m read
        </span>
        <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-200">
          English (US)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-muted-foreground">All changes saved</span>
      </div>
    </footer>
  );
}
