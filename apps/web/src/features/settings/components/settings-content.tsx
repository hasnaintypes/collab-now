"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Building2,
  Palette,
  Users,
  Shield,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitch } from "@/components/theme-switch";
import { dateConverter } from "@/lib/utils";

type SettingsContentProps = {
  user: {
    name: string;
    email: string;
    image: string;
    createdAt: string;
  };
  workspace: {
    id: string;
    name: string;
    role: string;
    memberCount: number;
  };
};

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex size-8 items-center justify-center rounded-sm bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h2>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-8 py-5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsContent({
  user,
  workspace,
}: SettingsContentProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <div className="space-y-16">
      {/* Appearance */}
      <section>
        <SectionHeader icon={Palette} title="Appearance" />
        <div className="rounded-sm bg-muted/40">
          <div className="px-6">
            <SettingRow
              label="Theme"
              description="Choose between light, dark, or system theme"
            >
              <ThemeSwitch />
            </SettingRow>
          </div>
        </div>
      </section>

      {/* Account */}
      <section>
        <SectionHeader icon={User} title="Account" />
        <div className="rounded-sm bg-muted/40">
          <div className="divide-y divide-border/50 px-6">
            <SettingRow label="Name">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {user.name}
                </span>
                <Link href="/profile">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
              </div>
            </SettingRow>
            <SettingRow label="Email">
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
            </SettingRow>
            <SettingRow label="Avatar">
              <div className="flex items-center gap-3">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}
                <Link href="/profile">
                  <Button variant="outline" size="sm">
                    Change
                  </Button>
                </Link>
              </div>
            </SettingRow>
            <SettingRow label="Member since">
              <span className="text-sm text-muted-foreground">
                {dateConverter(user.createdAt)}
              </span>
            </SettingRow>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section>
        <SectionHeader icon={Shield} title="Notifications" />
        <div className="rounded-sm bg-muted/40">
          <div className="divide-y divide-border/50 px-6">
            <SettingRow
              label="Document notifications"
              description="Get notified when someone mentions you or shares a document"
            >
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  notificationsEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block size-4 rounded-full bg-background shadow-sm transition-transform ${
                    notificationsEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </SettingRow>
            <SettingRow
              label="Email notifications"
              description="Receive email updates for workspace invites"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Always on
              </span>
            </SettingRow>
          </div>
        </div>
      </section>

      {/* Workspace */}
      <section>
        <SectionHeader icon={Building2} title="Workspace" />
        <div className="rounded-sm bg-muted/40">
          <div className="divide-y divide-border/50 px-6">
            <SettingRow label="Workspace name">
              <span className="text-sm text-muted-foreground">
                {workspace.name}
              </span>
            </SettingRow>
            <SettingRow label="Your role">
              <span className="rounded-sm bg-muted px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {workspace.role}
              </span>
            </SettingRow>
            <SettingRow label="Members">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {workspace.memberCount}
                  </span>
                </div>
              </div>
            </SettingRow>
            <SettingRow label="Document limit">
              <span className="text-sm text-muted-foreground">
                50 documents per workspace
              </span>
            </SettingRow>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <SectionHeader icon={ExternalLink} title="Quick Links" />
        <div className="grid grid-cols-1 gap-px md:grid-cols-3">
          <Link
            href="/profile"
            className="flex flex-col gap-2 bg-muted/40 p-6 transition-colors hover:bg-muted/60"
          >
            <span className="text-sm font-bold tracking-tight">
              Edit Profile
            </span>
            <span className="text-xs text-muted-foreground">
              Update your name and avatar
            </span>
          </Link>
          <Link
            href="/help"
            className="flex flex-col gap-2 bg-muted/40 p-6 transition-colors hover:bg-muted/60"
          >
            <span className="text-sm font-bold tracking-tight">
              Help Center
            </span>
            <span className="text-xs text-muted-foreground">
              Guides, shortcuts, and FAQ
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="flex flex-col gap-2 bg-muted/40 p-6 transition-colors hover:bg-muted/60"
          >
            <span className="text-sm font-bold tracking-tight">
              Dashboard
            </span>
            <span className="text-xs text-muted-foreground">
              Back to your documents
            </span>
          </Link>
        </div>
      </section>

      <Separator />

      {/* Danger Zone */}
      <section>
        <h2 className="mb-6 text-sm font-bold uppercase tracking-[0.2em] text-destructive/70">
          Danger Zone
        </h2>
        <div className="rounded-sm border border-destructive/20 bg-destructive/5">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
            </div>
            <Button variant="destructive" size="sm" disabled>
              Delete
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
