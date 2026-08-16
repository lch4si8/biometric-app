output "api_url" {
  description = "URL base del API Gateway"
  value       = aws_api_gateway_stage.api.invoke_url
}

output "users_table_name" {
  description = "Nombre de la tabla DynamoDB de usuarios"
  value       = aws_dynamodb_table.users.name
}

output "otp_table_name" {
  description = "Nombre de la tabla DynamoDB de OTPs"
  value       = aws_dynamodb_table.otp_codes.name
}
