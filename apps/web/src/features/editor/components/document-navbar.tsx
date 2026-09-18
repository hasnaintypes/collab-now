"use client";

import Link from "next/link";
import { FileText, FileDown, Printer } from "lucide-react";
import { LogoIcon } from "@/components/logo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ActiveCollaborators from "@/features/documents/components/active-collaborators";
import ShareDialog from "@/features/documents/components/share-dialog";
import UserButton from "@/components/shared/user-button";
import NoteStylePicker from "@/features/ingestion/components/note-style-picker";
import type { NoteStyle } from "@/features/ingestion/types";
import type { ExportFunctions } from "./plugins/export-plugin";
import type { RegenerateFunctions } from "./plugins/regenerate-notes-plugin";

export default function DocumentNavbar({
  roomId,
  roomMetadata,
  users,
  currentUserType,
  currentUser,
  exportRef,
  noteStyle,
  regenerateRef,
}: {
  roomId: string;
  roomMetadata: RoomMetadata;
  users: User[];
  currentUserType: UserType;
  currentUser: MinimalUser;
  exportRef: React.MutableRefObject<ExportFunctions | null>;
  /** `null` for a manually-created document — hides the style picker. */
  noteStyle: NoteStyle | null;
  regenerateRef: React.MutableRefObject<RegenerateFunctions | null>;
}) {
  return (
    <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-4 md:px-8 h-16 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 font-extrabold tracking-tighter text-xl"
        >
          <LogoIcon size={24} />
          <span className="hidden sm:inline">CollabNow</span>
        </Link>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="mr-1 md:mr-2 hidden sm:block">
          <ActiveCollaborators />
        </div>

        {/* Notes style — only for documents generated from a URL (P2-2) */}
        {noteStyle && (
          <NoteStylePicker
            roomId={roomId}
            initialStyle={noteStyle}
            regenerateRef={regenerateRef}
          />
        )}

        {/* Export */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="px-3 md:px-4 py-1.5 text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors">
              Export
            </button>
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

        <UserButton
          name={currentUser.name}
          email={currentUser.email}
          avatar={currentUser.avatar}
        />
      </div>
    </nav>
  );
}
