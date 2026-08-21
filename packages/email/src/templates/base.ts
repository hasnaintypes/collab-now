export function baseEmailHtml({
  heading,
  body,
}: {
  heading?: string;
  body: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
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
              ${heading ? `<h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#09090b;">${heading}</h2>` : ""}
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
