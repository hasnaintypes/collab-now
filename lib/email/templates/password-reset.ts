import { baseEmailHtml } from "./base";

export function passwordResetEmailHtml({
  name,
  resetUrl,
}: {
  name: string;
  resetUrl: string;
}) {
  return baseEmailHtml({
    heading: "Reset your password",
    body: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
        Hi <strong>${name}</strong>, we received a request to reset your password. Click the button below to choose a new one.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;padding:12px 24px;background:#09090b;color:#fafafa;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
        Reset Password
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
        This link expires in 1 hour. If you didn&rsquo;t request a password reset, you can safely ignore this email.
      </p>
    `,
  });
}
