"use client";

import { signOut } from "@/lib/auth/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function UserButton({
  name,
  email,
  avatar,
}: {
  name: string;
  email: string;
  avatar: string;
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <Popover>
      <PopoverTrigger className="flex size-9 items-center justify-center rounded-full outline-none transition-opacity hover:opacity-80">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="size-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {getInitials(name)}
          </div>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[240px] p-3"
      >
        <div className="flex items-center gap-3 pb-3">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {getInitials(name)}
            </div>
          )}
          <div className="flex flex-col overflow-hidden">
            <p className="truncate text-sm font-semibold tracking-tight">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
        <Separator />
        <Link
          href="/profile"
          className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
        >
          <User className="size-4" />
          Profile
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-destructive transition-colors hover:bg-muted"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}
