import { baseEmailHtml } from "./base";

export function welcomeEmailHtml({
  name,
  dashboardUrl,
}: {
  name: string;
  dashboardUrl: string;
}) {
  return baseEmailHtml({
    heading: "Welcome to Collab Now",
    body: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
        Hi <strong>${name}</strong>, your email has been verified and your account is ready. Start collaborating with your team in real time.
      </p>
      <a href="${dashboardUrl}"
         style="display:inline-block;padding:12px 24px;background:#09090b;color:#fafafa;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
        Go to Dashboard
      </a>
    `,
  });
}
