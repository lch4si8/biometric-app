/**
 * Lambda: POST /register
 *
 * Registra un nuevo usuario almacenando el vector facial maestro
 * de 128 dimensiones (ResNet-34) en la tabla biometric-users de DynamoDB.
 *
 * Body: { email: string, faceVector: number[128] }
 *
 * Respuestas:
 *   201 Created       — registro exitoso
 *   400 Bad Request   — datos de entrada inválidos
 *   409 Conflict      — el email ya está registrado
 *   500               — error interno
 */

import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, response } from '../lib/db.mjs';

const USERS_TABLE = process.env.USERS_TABLE;
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
    // Comprobar que el email no está ya registrado
    const existing = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { email: normalizedEmail },
        ProjectionExpression: 'email',
      })
    );

    if (existing.Item) {
      return response(409, {
        message: 'Este correo electrónico ya tiene un perfil biométrico registrado.',
      });
    }

    // Guardar vector maestro en DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          email: normalizedEmail,
          faceVector,
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: 'attribute_not_exists(email)',
      })
    );

    console.log(`[register] Vector maestro registrado para: ${normalizedEmail}`);

    return response(201, {
      message: 'Registro biométrico completado. Ya puedes iniciar sesión.',
    });
  } catch (err) {
    if (err?.name === 'ConditionalCheckFailedException') {
      return response(409, {
        message: 'Este correo electrónico ya tiene un perfil biométrico registrado.',
      });
    }

    console.error('[register] Error interno:', err);
    return response(500, { message: 'Error interno del servidor.' });
  }
};
