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
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#09090b;letter-spacing:-0.02em;">
                Collab Now
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px 32px 32px;">
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
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
