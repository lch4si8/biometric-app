/**
 * Calcula la Similitud Coseno entre dos vectores A y B de 128 dimensiones.
 *
 * Un umbral S_C >= 0.8 se considera un match facial válido.
 *
 * @param {number[]} a  Vector maestro almacenado en DynamoDB
 * @param {number[]} b  Vector de verificación enviado por el cliente
 * @returns {number}    Similitud coseno en [-1, 1]
 */
export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    throw new TypeError('cosineSimilarity: ambos argumentos deben ser arrays.');
  }
  if (a.length !== b.length) {
    throw new RangeError(
      `cosineSimilarity: los vectores deben tener la misma longitud (a=${a.length}, b=${b.length}).`
    );
  }
  if (a.length === 0) {
    throw new RangeError('cosineSimilarity: los vectores no pueden estar vacíos.');
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  if (magnitude === 0) {
    throw new RangeError('cosineSimilarity: la magnitud de uno de los vectores es cero.');
  }

  return dot / magnitude;
}
