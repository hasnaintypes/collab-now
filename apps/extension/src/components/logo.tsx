import iconWhite from "../assets/icon-white.png";

/**
 * Mirrors apps/web/src/components/logo.tsx, but single-variant: the
 * popup/options pages always render on the dark `--background`
 * (src/globals.css), so there's no light/dark swap to do — this is
 * permanently the white mark, the same asset the web app shows in dark
 * mode.
 */
export function LogoIcon({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={iconWhite}
      alt=""
      width={size}
      height={size}
      className={className}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoIcon size={22} />
      <span className="text-[15px] font-bold tracking-tight text-foreground">
        CollabNow
      </span>
    </span>
  );
}
