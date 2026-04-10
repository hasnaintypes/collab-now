"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";

export default function MobileSidebar(
  props: SidebarProps & { userId: string }
) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="md:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-sidebar p-0 px-4 py-6">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarContent {...props} onNavClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
