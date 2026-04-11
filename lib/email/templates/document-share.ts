import { baseEmailHtml } from "./base";

export function documentShareEmailHtml({
  sharerName,
  documentTitle,
  accessType,
  documentUrl,
}: {
  sharerName: string;
  documentTitle: string;
  accessType: string;
  documentUrl: string;
}) {
  return baseEmailHtml({
    heading: "Document shared with you",
    body: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
        <strong>${sharerName}</strong> shared <strong>${documentTitle}</strong> with you
        as a <strong>${accessType}</strong>.
      </p>
      <a href="${documentUrl}"
         style="display:inline-block;padding:12px 24px;background:#09090b;color:#fafafa;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
        Open Document
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
        If you didn&rsquo;t expect this email, you can safely ignore it.
      </p>
    `,
  });
}
