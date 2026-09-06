/**
 * Lambda: POST /verify-otp
 *
 * Body: { email: string, otp: string }
 *
 * Respuestas:
 *   200 OK            — autenticación MFA completada, cookie JWT establecida
 *   400 Bad Request   — inputs inválidos
 *   401 Unauthorized  — OTP inválido, expirado o no existente
 *   500               — error interno
 */

import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, response } from '../lib/db.mjs';
import { hashOtp } from '../lib/otp.mjs';
import { signToken, buildSessionCookie } from '../lib/jwt.mjs';

const OTP_TABLE = process.env.OTP_TABLE;
const JWT_SECRET = process.env.JWT_SECRET;
const IS_PROD = process.env.ENVIRONMENT !== 'dev';

export const handler = async (event) => {
  // Parsear body
  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return response(400, { message: 'El cuerpo de la solicitud no es JSON válido.' });
  }

  const { email, otp } = body;

  // Validar inputs
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response(400, { message: 'El campo email es inválido o está ausente.' });
  }

  if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    return response(400, { message: 'El campo otp debe ser una cadena de 6 dígitos numéricos.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Recuperar registro OTP de DynamoDB
    const record = await docClient.send(
      new GetCommand({
        TableName: OTP_TABLE,
        Key: { email: normalizedEmail },
        ProjectionExpression: 'otpHash, #ttl',
        ExpressionAttributeNames: { '#ttl': 'ttl' },
      })
    );

    // Comprobar existencia
    if (!record.Item) {
      console.warn(`[verify-otp] Registro OTP no encontrado para: ${normalizedEmail}`);
      return response(401, {
        message: 'Código OTP inválido o expirado. Por favor, vuelve a iniciar sesión.',
      });
    }

    // Comprobar expiración manual
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (record.Item.ttl && record.Item.ttl < nowSeconds) {
      console.warn(`[verify-otp] OTP expirado (TTL=${record.Item.ttl}) para: ${normalizedEmail}`);
      // Limpieza anticipada del registro expirado
      await docClient.send(
        new DeleteCommand({ TableName: OTP_TABLE, Key: { email: normalizedEmail } })
      );
      return response(401, {
        message: 'El código OTP ha expirado. Por favor, vuelve a iniciar sesión.',
      });
    }

    // Comparación de hashes criptográficos
    //  Se hashea el OTP entrante y se compara contra el hash almacenado.
    const incomingHash = hashOtp(otp);

    if (incomingHash !== record.Item.otpHash) {
      console.warn(`[verify-otp] Hash OTP inválido para: ${normalizedEmail}`);
      return response(401, {
        message: 'Código OTP incorrecto. Verifica el código recibido en tu email.',
      });
    }

    // DeleteItem -> PREVENCIÓN DE ATAQUES DE REPETICIÓN
    await docClient.send(
      new DeleteCommand({
        TableName: OTP_TABLE,
        Key: { email: normalizedEmail },
      })
    );

    console.log(`[verify-otp] OTP validado y eliminado para: ${normalizedEmail}`);

    // Firmar token JWT
    const token = signToken(normalizedEmail, JWT_SECRET, '1h');

    // Construir Set-Cookie con flags de seguridad
    // HttpOnly   → el JS del cliente no puede leer la cookie
    // Secure     → solo HTTPS (desactivado en desarrollo local HTTP)
    // SameSite=Strict → protección CSRF
    const cookieValue = buildSessionCookie(token, IS_PROD);

    console.log(`[verify-otp] Sesión JWT emitida para: ${normalizedEmail}`);

    return response(
      200,
      { message: 'Autenticación MFA completada con éxito.' },
      { 'Set-Cookie': cookieValue }
    );
  } catch (err) {
    console.error('[verify-otp] Error interno:', err);
    return response(500, { message: 'Error interno del servidor.' });
  }
};
