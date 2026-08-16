# ─────────────────────────────────────────────────────────────────
# Empaquetado del código Lambda
# ─────────────────────────────────────────────────────────────────
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/src"
  output_path = "${path.module}/../backend/dist/lambda.zip"
}

# ─────────────────────────────────────────────────────────────────
# IAM Role para las funciones Lambda
# ─────────────────────────────────────────────────────────────────
resource "aws_iam_role" "lambda_role" {
  name = "biometric-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Environment = var.environment
    Project     = "biometric-app"
  }
}

# ─────────────────────────────────────────────────────────────────
# IAM Policy — DynamoDB + SES + CloudWatch Logs
# ─────────────────────────────────────────────────────────────────
resource "aws_iam_role_policy" "lambda_policy" {
  name = "biometric-lambda-policy-${var.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.users.arn,
          aws_dynamodb_table.otp_codes.arn
        ]
      },
      {
        Sid    = "SESAccess"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ─────────────────────────────────────────────────────────────────
# Variables de entorno compartidas por las tres Lambdas
# ─────────────────────────────────────────────────────────────────
locals {
  lambda_environment = {
    USERS_TABLE          = aws_dynamodb_table.users.name
    OTP_TABLE            = aws_dynamodb_table.otp_codes.name
    JWT_SECRET           = var.jwt_secret
    SIMILARITY_THRESHOLD = tostring(var.similarity_threshold)
    OTP_TTL_SECONDS      = tostring(var.otp_ttl_seconds)
    SES_SENDER_EMAIL     = var.ses_sender_email
  }
}

# ─────────────────────────────────────────────────────────────────
# Lambda: biometric-register (POST /register)
# ─────────────────────────────────────────────────────────────────
resource "aws_lambda_function" "register" {
  function_name    = "biometric-register-${var.environment}"
  role             = aws_iam_role.lambda_role.arn
  handler          = "handlers/register.handler"
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  timeout          = 10
  memory_size      = 256
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = local.lambda_environment
  }

  tags = {
    Environment = var.environment
    Project     = "biometric-app"
  }
}

# ─────────────────────────────────────────────────────────────────
# Lambda: biometric-login (POST /login)
# ─────────────────────────────────────────────────────────────────
resource "aws_lambda_function" "login" {
  function_name    = "biometric-login-${var.environment}"
  role             = aws_iam_role.lambda_role.arn
  handler          = "handlers/login.handler"
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  timeout          = 10
  memory_size      = 256
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = local.lambda_environment
  }

  tags = {
    Environment = var.environment
    Project     = "biometric-app"
  }
}

# ─────────────────────────────────────────────────────────────────
# Lambda: biometric-verify-otp (POST /verify-otp)
# ─────────────────────────────────────────────────────────────────
resource "aws_lambda_function" "verify_otp" {
  function_name    = "biometric-verify-otp-${var.environment}"
  role             = aws_iam_role.lambda_role.arn
  handler          = "handlers/verify-otp.handler"
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  timeout          = 10
  memory_size      = 256
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = local.lambda_environment
  }

  tags = {
    Environment = var.environment
    Project     = "biometric-app"
  }
}
