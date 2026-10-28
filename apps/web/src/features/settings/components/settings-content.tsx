"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  Building2,
  Palette,
  Users,
  Bell,
  KeyRound,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "@/components/theme-switch";
import { cn, dateConverter } from "@/lib/utils";
import WorkspaceMembersList from "@/features/workspace/components/workspace-members-list";
import PendingInvitesList from "@/features/workspace/components/pending-invites-list";
import LeaveWorkspaceButton from "@/features/workspace/components/leave-workspace-button";
import DeleteAccountSection from "./delete-account-section";
import PersonalAccessTokensSection from "./personal-access-tokens-section";
import BillingSection from "@/features/billing/components/billing-section";
import type {
  WorkspaceMember,
  WorkspaceRole,
  PendingInvite,
} from "@/features/workspace/types";
import type { PersonalAccessToken } from "../actions/token.actions";
import type { WorkspaceSubscription } from "@/features/billing/types";

type SettingsContentProps = {
  user: {
    id: string;
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
  members: WorkspaceMember[];
  pendingInvites: PendingInvite[];
  tokens: PersonalAccessToken[];
  subscription: WorkspaceSubscription;
};

const SECTIONS = [
  { id: "account", label: "Account", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "developer", label: "Developer", icon: KeyRound },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"] | "danger";

function isSectionId(value: string | null): value is SectionId {
  return (
    value !== null &&
    (SECTIONS.some((s) => s.id === value) || value === "danger")
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
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-6 text-xl font-bold tracking-tight">{children}</h2>
  );
}

export default function SettingsContent({
  user,
  workspace,
  members,
  pendingInvites,
  tokens,
  subscription,
}: SettingsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeSection, setActiveSection] = useState<SectionId>(
    isSectionId(tabParam) ? tabParam : "account"
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Keeps the URL in sync (shallow, no navigation/reload) so a section is
  // bookmarkable/shareable and deep-linkable from elsewhere in the app
  // (e.g. UpgradeLink already points at `?tab=billing`).
  const selectSection = (id: SectionId) => {
    setActiveSection(id);
    router.replace(`/settings?tab=${id}`, { scroll: false });
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
      {/* Nav — vertical column on desktop, horizontal scrollable strip on
          mobile. Replaces the old single long scrolling page (every
          section stacked, plus a redundant "Quick Links" block whose job
          this nav now does) with the usual settings-page shape: a fixed
          list of destinations on the side, one panel visible at a time. */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto lg:sticky lg:top-10 lg:w-56 lg:flex-col lg:overflow-visible">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => selectSection(section.id)}
            className={cn(
              "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-sm px-3 py-2.5 text-sm font-medium transition-colors",
              activeSection === section.id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <section.icon className="size-4" />
            {section.label}
          </button>
        ))}
        <button
          onClick={() => selectSection("danger")}
          className={cn(
            "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-sm px-3 py-2.5 text-sm font-medium transition-colors",
            activeSection === "danger"
              ? "bg-destructive/10 text-destructive"
              : "text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <AlertTriangle className="size-4" />
          Danger Zone
        </button>
      </nav>

      {/* Panel */}
      <div className="min-w-0 flex-1">
        {activeSection === "account" && (
          <section>
            <PanelHeading>Account</PanelHeading>
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
                  <span className="block max-w-[50vw] truncate text-sm text-muted-foreground sm:max-w-xs">
                    {user.email}
                  </span>
                </SettingRow>
                <SettingRow label="Avatar">
                  <div className="flex items-center gap-3">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={32}
                        height={32}
                        className="size-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {initials}
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
        )}

        {activeSection === "appearance" && (
          <section>
            <PanelHeading>Appearance</PanelHeading>
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
        )}

        {activeSection === "notifications" && (
          <section>
            <PanelHeading>Notifications</PanelHeading>
            <div className="rounded-sm bg-muted/40">
              <div className="divide-y divide-border/50 px-6">
                <SettingRow
                  label="Document notifications"
                  description="Get notified when someone mentions you or shares a document"
                >
                  <button
                    onClick={() =>
                      setNotificationsEnabled(!notificationsEnabled)
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                      notificationsEnabled ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block size-4 rounded-full bg-background shadow-sm transition-transform ${
                        notificationsEnabled
                          ? "translate-x-6"
                          : "translate-x-1"
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
        )}

        {activeSection === "workspace" && (
          <section>
            <PanelHeading>Workspace</PanelHeading>
            <div className="rounded-sm bg-muted/40">
              <div className="divide-y divide-border/50 px-6">
                <SettingRow label="Workspace name">
                  <span className="block max-w-[50vw] truncate text-sm text-muted-foreground sm:max-w-xs">
                    {workspace.name}
                  </span>
                </SettingRow>
                <SettingRow label="Your role">
                  <span className="rounded-sm bg-muted px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {workspace.role}
                  </span>
                </SettingRow>
                <SettingRow label="Members">
                  <div className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {workspace.memberCount}
                    </span>
                  </div>
                </SettingRow>
                <SettingRow label="Document limit">
                  <span className="text-sm text-muted-foreground">
                    50 documents per workspace
                  </span>
                </SettingRow>
              </div>
            </div>

            {/* Member list — visible to everyone, but remove actions are
                only rendered (and only server-permitted) for owners/admins. */}
            {members.length > 0 && (
              <div className="mt-6 rounded-sm bg-muted/40">
                <div className="px-6 pt-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Members
                  </h3>
                </div>
                <WorkspaceMembersList
                  members={members}
                  workspaceId={workspace.id}
                  currentUserId={user.id}
                  currentUserRole={workspace.role as WorkspaceRole}
                />
              </div>
            )}

            {/* Pending invites — a separate, visible place to cancel one
                (previously only reachable by reopening the Invite Member
                dialog). Invites that have expired (INVITE_EXPIRY_MS, 30
                minutes) never reach this list — getPendingInvites already
                filters those out server-side. */}
            {pendingInvites.length > 0 && (
              <div className="mt-6 rounded-sm bg-muted/40">
                <div className="px-6 pt-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Pending Invites
                  </h3>
                </div>
                <PendingInvitesList
                  invites={pendingInvites}
                  workspaceId={workspace.id}
                  currentUserId={user.id}
                  currentUserRole={workspace.role as WorkspaceRole}
                />
              </div>
            )}
          </section>
        )}

        {activeSection === "billing" && (
          <section>
            <PanelHeading>Billing</PanelHeading>
            <BillingSection
              workspaceId={workspace.id}
              subscription={subscription}
              canManageBilling={
                workspace.role === "owner" || workspace.role === "admin"
              }
            />
          </section>
        )}

        {activeSection === "developer" && (
          <section>
            <PanelHeading>Developer</PanelHeading>
            <PersonalAccessTokensSection tokens={tokens} />
          </section>
        )}

        {activeSection === "danger" && (
          <section>
            <PanelHeading>Danger Zone</PanelHeading>
            <div className="divide-y divide-destructive/20 rounded-sm border border-destructive/20 bg-destructive/5">
              {/* Workspace owners can't leave their own workspace —
                  there's no ownership-transfer feature yet, so the only
                  way out would be deleting the whole workspace, which
                  also isn't built. */}
              {workspace.role !== "owner" && (
                <div className="flex items-center justify-between px-6 py-5">
                  <div>
                    <p className="text-sm font-medium">Leave workspace</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Remove yourself from &ldquo;{workspace.name}&rdquo;. You
                      can only rejoin if someone invites you back.
                    </p>
                  </div>
                  <LeaveWorkspaceButton
                    workspaceId={workspace.id}
                    workspaceName={workspace.name}
                    userId={user.id}
                  />
                </div>
              )}
              <DeleteAccountSection />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
