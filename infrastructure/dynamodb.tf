# ─────────────────────────────────────────────────────────────────
# Tabla: biometric-users
# Almacena el vector maestro facial (128 dims) por email
# ─────────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "users" {
  name         = "biometric-users-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "email"

  attribute {
    name = "email"
    type = "S"
  }

  tags = {
    Environment = var.environment
    Project     = "biometric-app"
  }
}

# ─────────────────────────────────────────────────────────────────
# Tabla: otp-codes
# Almacena el hash SHA-256 del OTP con TTL nativo de DynamoDB
# para expiración automática
# ─────────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "otp_codes" {
  name         = "otp-codes-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "email"

  attribute {
    name = "email"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Environment = var.environment
    Project     = "biometric-app"
  }
}
