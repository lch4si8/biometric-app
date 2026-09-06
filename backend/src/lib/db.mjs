import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddbConfig = {};

// Para probar en local con floci
if (process.env.DYNAMODB_ENDPOINT) {
  ddbConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  ddbConfig.region = process.env.AWS_DEFAULT_REGION || 'eu-west-1';
}

const ddbClient = new DynamoDBClient(ddbConfig);

/**
 * DynamoDB Document Client con opciones de traducción de tipos.
 * Convierte automáticamente entre tipos JS nativos y el formato
 * de atributos de DynamoDB.
 */
export const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
  },
});

/**
 * Respuesta HTTP estandarizada para las Lambdas.
 * Incluye headers CORS para desarrollo local.
 *
 * @param {number} statusCode  Código HTTP
 * @param {object} body        Objeto de respuesta (se serializa a JSON)
 * @param {object} [extraHeaders]  Headers adicionales (ej. Set-Cookie)
 */
export function response(statusCode, body, extraHeaders = {}) {
  const isLocalDev = process.env.ENVIRONMENT === 'dev';

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': isLocalDev ? 'http://localhost:4200' : process.env.FRONTEND_ORIGIN || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}
