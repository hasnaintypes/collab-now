import { baseEmailHtml } from "./base";

export function inviteEmailHtml({
  inviterName,
  workspaceName,
  role,
  acceptUrl,
}: {
  inviterName: string;
  workspaceName: string;
  role: string;
  acceptUrl: string;
}) {
  return baseEmailHtml({
    body: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
        <strong>${inviterName}</strong> invited you to join
        <strong>${workspaceName}</strong> as a <strong>${role}</strong>.
      </p>
      <a href="${acceptUrl}"
         style="display:inline-block;padding:12px 24px;background:#09090b;color:#fafafa;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
        Accept Invite
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
        This invite expires in 7 days. If you didn&rsquo;t expect this email, you can safely ignore it.
      </p>
    `,
  });
}
