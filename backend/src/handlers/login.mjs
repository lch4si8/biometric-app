/**
 * Lambda: POST /login
 *
 * Body: { email: string, faceVector: number[128] }
 *
 * Respuestas:
 *   200 OK            — match exitoso, OTP enviado por email
 *   400 Bad Request   — inputs inválidos
 *   401 Unauthorized  — identidad no verificada
 *   404 Not Found     — email no registrado
 *   500               — error interno
 */

import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, response } from '../lib/db.mjs';
import { cosineSimilarity } from '../lib/cosine-similarity.mjs';
import { generateOtp, hashOtp, otpTtlTimestamp } from '../lib/otp.mjs';
import { sendOtpEmail } from '../lib/email.mjs';

const USERS_TABLE = process.env.USERS_TABLE;
const OTP_TABLE = process.env.OTP_TABLE;
const THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD ?? '0.8');
const OTP_TTL_SECONDS = parseInt(process.env.OTP_TTL_SECONDS ?? '120', 10);
const FACE_VECTOR_LENGTH = 128;

export const handler = async (event) => {
  // Parsear body
  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return response(400, { message: 'El cuerpo de la solicitud no es JSON válido.' });
  }

  const { email, faceVector } = body;

  // Validar inputs
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response(400, { message: 'El campo email es inválido o está ausente.' });
  }

  if (
    !Array.isArray(faceVector) ||
    faceVector.length !== FACE_VECTOR_LENGTH ||
    faceVector.some((v) => typeof v !== 'number' || !isFinite(v))
  ) {
    return response(400, {
      message: `El campo faceVector debe ser un array de ${FACE_VECTOR_LENGTH} números finitos.`,
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Recuperar vector maestro de DynamoDB
    const userRecord = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { email: normalizedEmail },
        ProjectionExpression: 'faceVector',
      })
    );

    if (!userRecord.Item) {
      return response(404, {
        message: 'No se encontró ningún usuario registrado con ese correo electrónico.',
      });
    }

    const masterVector = userRecord.Item.faceVector;

    // Calcular Similitud Coseno
    const sc = cosineSimilarity(masterVector, faceVector);

    console.log(`[login] SC=${sc.toFixed(6)} umbral=${THRESHOLD} email=${normalizedEmail}`);

    // Evaluar umbral
    if (sc < THRESHOLD) {
      console.warn(`[login] Fallo biométrico (SC=${sc.toFixed(6)} < ${THRESHOLD}) para: ${normalizedEmail}`);
      return response(401, {
        message: 'Identidad no verificada. El patrón facial no coincide con el registrado.',
      });
    }

    // Generar OTP y aplicar hash SHA-256
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const ttl = otpTtlTimestamp(OTP_TTL_SECONDS);

    // Guardar hash OTP en DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: OTP_TABLE,
        Item: {
          email: normalizedEmail,
          otpHash,
          ttl,
          createdAt: new Date().toISOString(),
        },
      })
    );

    // Enviar OTP al email del usuario
    await sendOtpEmail(normalizedEmail, otp);

    console.log(`[login] OTP enviado a: ${normalizedEmail} (expira en ${OTP_TTL_SECONDS}s)`);

    // Responder - el OTP no se incluye en la respuesta HTTP
    return response(200, { requiresOtp: true });
  } catch (err) {
    console.error('[login] Error interno:', err);
    return response(500, { message: 'Error interno del servidor.' });
  }
};
