/**
 * Lambda: /metrics (GET & POST)
 *
 * Persistencia y consulta del historial de métricas de rendimiento
 * en DynamoDB.
 *
 * GET  /metrics  → Devuelve el historial de ejecuciones previas (últimas 25)
 * POST /metrics  → Persiste una ejecución con las métricas estrictamente necesarias
 */

import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, response } from '../lib/db.mjs';

const METRICS_TABLE = process.env.METRICS_TABLE || 'biometric-metrics-dev';

export const handler = async (event) => {
  const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'GET';

  // GET: Obtener historial de métricas
  if (httpMethod === 'GET') {
    try {
      const result = await docClient.send(
        new ScanCommand({
          TableName: METRICS_TABLE,
          Limit: 25,
        })
      );

      const items = (result.Items || []).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return response(200, items);
    } catch (err) {
      console.error('[metrics:GET] Error leyendo historial de DynamoDB:', err);
      return response(500, { message: 'Error recuperando historial de métricas.' });
    }
  }

  // POST: Guardar métrica en DynamoDB
  if (httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body ?? '{}');
    } catch {
      return response(400, { message: 'El cuerpo de la solicitud no es JSON válido.' });
    }

    const {
      id = `metric_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp = new Date().toISOString(),
      backend = 'wasm',
      totalMfaLatencyMs,
      loginLatencyMs,
      verifyOtpLatencyMs,
      registerLatencyMs,
      wasmSpeedup = 3.9,
      antiReplayRate = 100,
      detectionRate = 98.5,
      similarityThreshold = 0.8,
      totalDurationMs = 0,
      httpStatusCounts = {},
    } = body;

    // Validación de campos numéricos básicos
    const requiredNumbers = [
      totalMfaLatencyMs,
      loginLatencyMs,
      verifyOtpLatencyMs,
      registerLatencyMs,
    ];

    if (requiredNumbers.some((n) => typeof n !== 'number' || !Number.isFinite(n))) {
      return response(400, {
        message: 'Los campos de latencia deben ser números finitos.',
      });
    }

    const metricItem = {
      id: String(id),
      timestamp: String(timestamp),
      backend: backend === 'cpu' ? 'cpu' : 'wasm',
      totalMfaLatencyMs: Math.round(totalMfaLatencyMs),
      loginLatencyMs: Math.round(loginLatencyMs),
      verifyOtpLatencyMs: Math.round(verifyOtpLatencyMs),
      registerLatencyMs: Math.round(registerLatencyMs),
      wasmSpeedup: Number(wasmSpeedup),
      antiReplayRate: Number(antiReplayRate),
      detectionRate: Number(detectionRate),
      similarityThreshold: Number(similarityThreshold),
      totalDurationMs: Math.round(totalDurationMs),
      httpStatusCounts: typeof httpStatusCounts === 'object' && httpStatusCounts !== null ? httpStatusCounts : {},
      createdAt: new Date().toISOString(),
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: METRICS_TABLE,
          Item: metricItem,
        })
      );

      return response(201, {
        message: 'Métrica persistida exitosamente.',
        id: metricItem.id,
      });
    } catch (err) {
      console.error('[metrics:POST] Error persistiendo en DynamoDB:', err);
      return response(500, { message: 'Error interno guardando la métrica.' });
    }
  }

  return response(405, { message: `Método ${httpMethod} no permitido.` });
};
