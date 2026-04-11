"use client";

import Link from "next/link";
import { Download, FileText, FileDown, Printer } from "lucide-react";
import { LogoIcon } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ActiveCollaborators from "./active-collaborators";
import ShareDialog from "./share-dialog";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/components/shared/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ExportFunctions } from "@/components/editor/plugins/export-plugin";

export default function DocumentNavbar({
  roomId,
  roomMetadata,
  users,
  currentUserType,
  currentUser,
  exportRef,
}: {
  roomId: string;
  roomMetadata: RoomMetadata;
  users: User[];
  currentUserType: UserType;
  currentUser: { name: string; email: string; avatar: string };
  exportRef: React.MutableRefObject<ExportFunctions | null>;
}) {
  return (
    <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-8 h-16 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="flex items-center gap-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 font-extrabold tracking-tighter text-xl"
        >
          <LogoIcon size={24} />
          CollabNow
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="mr-2">
          <ActiveCollaborators />
        </div>
        <span className="px-4 py-1.5 text-sm font-medium bg-muted text-foreground">
          {currentUserType === "editor" ? "Edit" : "View"}
        </span>

        {/* Export */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" title="Export document">
              <Download className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-1">
            <button
              onClick={() => exportRef.current?.exportMarkdown()}
              className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <FileDown className="size-4 text-muted-foreground" />
              Markdown
            </button>
            <button
              onClick={() => exportRef.current?.exportPlainText()}
              className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <FileText className="size-4 text-muted-foreground" />
              Plain Text
            </button>
            <button
              onClick={() => exportRef.current?.exportPdf()}
              className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Printer className="size-4 text-muted-foreground" />
              Print / PDF
            </button>
          </PopoverContent>
        </Popover>

        <ShareDialog
          roomId={roomId}
          collaborators={users}
          creatorId={roomMetadata.creatorId}
          currentUserType={currentUserType}
        />
        <div className="flex gap-1 ml-1">
          <ThemeToggle />
          <Notifications />
          <UserButton
            name={currentUser.name}
            email={currentUser.email}
            avatar={currentUser.avatar}
          />
        </div>
      </div>
    </nav>
  );
}
