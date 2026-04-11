import { baseEmailHtml } from "./base";

export function verificationEmailHtml({
  name,
  verifyUrl,
}: {
  name: string;
  verifyUrl: string;
}) {
  return baseEmailHtml({
    heading: "Verify your email",
    body: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
        Hi <strong>${name}</strong>, thanks for signing up. Please verify your email address to get started.
      </p>
      <a href="${verifyUrl}"
         style="display:inline-block;padding:12px 24px;background:#09090b;color:#fafafa;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
        Verify Email
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
        This link expires in 24 hours. If you didn&rsquo;t create an account, you can safely ignore this email.
      </p>
    `,
  });
}
