"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Folder, Clock, Settings, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "All Files", icon: Folder },
  { href: "/dashboard?filter=recent", label: "Recent", icon: Clock },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-sidebar px-4 py-6 pt-24 md:flex border-r border-sidebar-border">
      {/* Workspace info */}
      <div className="mb-10 px-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-sm bg-sidebar-primary font-bold text-sidebar-primary-foreground">
            CN
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-sidebar-foreground">
              Workspace
            </h3>
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
              Personal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname + "?" === item.href.split("?")[0] + "?";
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm tracking-wide transition-colors",
                isActive
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="size-5" strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="mt-auto space-y-1 pt-6">
        <button className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50">
          <Settings className="size-5" strokeWidth={1.5} />
          <span>Settings</span>
        </button>
        <button className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50">
          <HelpCircle className="size-5" strokeWidth={1.5} />
          <span>Help</span>
        </button>
      </div>
    </aside>
  );
}
