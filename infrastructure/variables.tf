variable "aws_region" {
  description = "Región AWS para el despliegue"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Entorno de despliegue (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "jwt_secret" {
  description = "Clave secreta para la firma de tokens JWT"
  type        = string
  sensitive   = true
}

variable "otp_ttl_seconds" {
  description = "Tiempo de vida del OTP en segundos"
  type        = number
  default     = 120 # 2 minutos
}

variable "similarity_threshold" {
  description = "Umbral de similitud coseno para el matching facial"
  type        = number
  default     = 0.6
}

variable "ses_sender_email" {
  description = "Dirección de email verificada en SES para enviar OTPs"
  type        = string
}
