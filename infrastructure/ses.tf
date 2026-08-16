# ─────────────────────────────────────────────────────────────────
# Amazon SES — Identidad de email verificada
# En desarrollo con Floci, la verificación es automática.
# En producción, AWS enviará un email de confirmación.
# ─────────────────────────────────────────────────────────────────
resource "aws_ses_email_identity" "sender" {
  email = var.ses_sender_email
}
