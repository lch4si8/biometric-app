import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const sesClient = new SESv2Client({});

/**
 * Envía el código OTP al email del usuario a través de Amazon SES
 *
 * @param {string} to   Dirección de destino (email del usuario)
 * @param {string} otp  Código OTP en texto plano (6 dígitos)
 */
export async function sendOtpEmail(to, otp) {
  const senderEmail = process.env.SES_SENDER_EMAIL;

  if (!senderEmail) {
    throw new Error('Variable de entorno SES_SENDER_EMAIL no configurada.');
  }

  const command = new SendEmailCommand({
    FromEmailAddress: senderEmail,
    Destination: {
      ToAddresses: [to],
    },
    Content: {
      Simple: {
        Subject: {
          Data: 'Tu código de acceso — Biometric MFA',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: [
              `Tu código de verificación es: ${otp}`,
              '',
              'Este código es válido durante 2 minutos.',
              'Si no has intentado iniciar sesión, ignora este mensaje.',
            ].join('\n'),
            Charset: 'UTF-8',
          },
          Html: {
            Data: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="background:#060d18;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060d18;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#0d1a2d;border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
          <tr>
            <td style="padding:36px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#64748b;font-weight:600;">BIOMETRIC MFA</p>
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;">Código de Verificación</h1>
              <p style="margin:0 0 32px;font-size:15px;color:#8899aa;">Introduce este código para completar tu acceso.</p>

              <div style="background:#15243b;border-radius:16px;padding:28px 20px;margin:0 auto 32px;display:inline-block;border:1px solid rgba(255,255,255,0.1);">
                <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#60a5fa;font-family:monospace;">${otp}</span>
              </div>

              <div style="background:rgba(0,229,160,0.08);border-left:3px solid #00e5a0;border-radius:8px;padding:12px 16px;text-align:left;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#94a3b8;">
                  ⏱ <strong style="color:#00e5a0;">Válido durante 2 minutos.</strong>
                  Si no has solicitado este código, ignora este mensaje.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#060d18;padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;font-size:12px;color:#475569;text-align:center;">
                Por motivos de seguridad, nunca compartas este código con nadie.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
            Charset: 'UTF-8',
          },
        },
      },
    },
  });

  await sesClient.send(command);
}
