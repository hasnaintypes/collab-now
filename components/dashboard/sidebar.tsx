"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Folder, Clock, Star, Archive, Settings, HelpCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import InviteMemberDialog from "./invite-member-dialog";

const navItems = [
  { href: "/dashboard", label: "All Files", icon: Folder, filter: null },
  { href: "/dashboard?filter=recent", label: "Recent", icon: Clock, filter: "recent" },
  { href: "/dashboard?filter=starred", label: "Starred", icon: Star, filter: "starred" },
  { href: "/dashboard?filter=archived", label: "Archive", icon: Archive, filter: "archived" },
];

export function SidebarContent({
  workspaceName,
  workspaceRole,
  memberCount,
  workspaceId,
  userId,
  onNavClick,
}: SidebarProps & { userId: string; onNavClick?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canInvite = workspaceRole === "owner" || workspaceRole === "admin";

  return (
    <>
      {/* Workspace info */}
      <div className="mb-10 px-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-sm bg-sidebar-primary font-bold text-sidebar-primary-foreground">
            {workspaceName?.charAt(0)?.toUpperCase() || "W"}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">
              {workspaceName || "Workspace"}
            </h3>
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
              <Users className="size-3" />
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.filter === null
              ? pathname === "/dashboard" && !searchParams.get("filter")
              : pathname === "/dashboard" && searchParams.get("filter") === item.filter;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavClick}
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
        {canInvite && (
          <InviteMemberDialog
            workspaceId={workspaceId}
            invitedById={userId}
          />
        )}
        <Link
          href="/settings"
          onClick={onNavClick}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50"
        >
          <Settings className="size-5" strokeWidth={1.5} />
          <span>Settings</span>
        </Link>
        <Link
          href="/help"
          onClick={onNavClick}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50"
        >
          <HelpCircle className="size-5" strokeWidth={1.5} />
          <span>Help</span>
        </Link>
      </div>
    </>
  );
}

export default function Sidebar(props: SidebarProps & { userId: string }) {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-sidebar px-4 py-6 pt-24 md:flex border-r border-sidebar-border">
      <SidebarContent {...props} />
    </aside>
  );
}
