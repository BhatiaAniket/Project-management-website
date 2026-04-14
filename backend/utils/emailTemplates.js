const getVerificationEmailTemplate = (userName, verificationUrl) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your CognifyPM Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #EAEAE4; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #EAEAE4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 520px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0D0D0D; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                CognifyPM
              </h1>
              <p style="margin: 4px 0 0; color: #888888; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">
                Project Management Platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 48px 40px 32px;">
              <h2 style="margin: 0 0 8px; color: #0D0D0D; font-size: 22px; font-weight: 600;">
                Verify your email
              </h2>
              <p style="margin: 0 0 28px; color: #555555; font-size: 15px; line-height: 1.6;">
                Hi <strong>${userName}</strong>,<br><br>
                Thanks for creating your CognifyPM account. Please click the button below to verify your email address and activate your account.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; background-color: #0D0D0D; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 999px; letter-spacing: 0.02em;">
                      Verify My Account →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 28px 0 0; color: #888888; font-size: 13px; line-height: 1.5;">
                Or copy and paste this link into your browser:<br>
                <a href="${verificationUrl}" style="color: #0D0D0D; word-break: break-all;">${verificationUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #EAEAE4; margin: 0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px;">
              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6; text-align: center;">
                This link expires in <strong>24 hours</strong>.<br>
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>

        <!-- Sub-footer -->
        <p style="margin: 24px 0 0; color: #999999; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} CognifyPM. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

module.exports = { getVerificationEmailTemplate };
