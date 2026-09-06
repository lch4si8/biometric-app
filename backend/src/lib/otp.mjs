import { createHash, randomInt } from 'node:crypto';

/**
 * Genera un OTP criptográficamente aleatorio de 6 dígitos.
 *
 * @returns {string}  Código OTP de 6 dígitos (con cero inicial si aplica)
 */
export function generateOtp() {
  const num = randomInt(100000, 1000000); // Garantiza exactamente 6 dígitos
  return String(num).padStart(6, '0');
}

/**
 * Aplica hash SHA-256 al OTP en texto plano.
 *
 * @param {string} otp  Código OTP en texto plano
 * @returns {string}    Hash hexadecimal SHA-256 (64 caracteres)
 */
export function hashOtp(otp) {
  return createHash('sha256').update(otp, 'utf8').digest('hex');
}

/**
 * Calcula el timestamp Unix de expiración del OTP.
 *
 * @param {number} ttlSeconds  Segundos de vida del OTP (default: 120)
 * @returns {number}           Unix timestamp en segundos (para atributo TTL de DynamoDB)
 */
export function otpTtlTimestamp(ttlSeconds = 120) {
  return Math.floor(Date.now() / 1000) + ttlSeconds;
}
