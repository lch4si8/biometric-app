import { jest } from '@jest/globals';

// Mock de docClient antes de importar el handler
const mockSend = jest.fn();
jest.unstable_mockModule('../src/lib/db.mjs', () => ({
  docClient: {
    send: mockSend,
  },
  response: (statusCode, body, extraHeaders = {}) => ({
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'http://localhost:4200',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  }),
}));

const { handler } = await import('../src/handlers/metrics.mjs');

describe('Lambda /metrics handler', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  describe('GET /metrics', () => {
    test('devuelve 200 con lista ordenada por timestamp', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [
          { id: 'm2', timestamp: '2026-09-19T12:00:00.000Z', totalMfaLatencyMs: 200 },
          { id: 'm1', timestamp: '2026-09-19T10:00:00.000Z', totalMfaLatencyMs: 250 },
        ],
      });

      const res = await handler({ httpMethod: 'GET' });
      expect(res.statusCode).toBe(200);

      const items = JSON.parse(res.body);
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('m1'); // Orden ascendente
      expect(items[1].id).toBe('m2');
    });

    test('devuelve array vacío si no hay items', async () => {
      mockSend.mockResolvedValueOnce({});
      const res = await handler({ httpMethod: 'GET' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual([]);
    });

    test('maneja errores de DynamoDB devolviendo 500', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB timeout'));
      const res = await handler({ httpMethod: 'GET' });
      expect(res.statusCode).toBe(500);
    });
  });

  describe('POST /metrics', () => {
    test('devuelve 400 si el body no es JSON válido', async () => {
      const res = await handler({
        httpMethod: 'POST',
        body: 'invalid-json',
      });
      expect(res.statusCode).toBe(400);
    });

    test('devuelve 400 si faltan campos de latencia o no son números', async () => {
      const res = await handler({
        httpMethod: 'POST',
        body: JSON.stringify({
          totalMfaLatencyMs: 'not-a-number',
          loginLatencyMs: 100,
          verifyOtpLatencyMs: 50,
          registerLatencyMs: 80,
        }),
      });
      expect(res.statusCode).toBe(400);
    });

    test('persiste métrica válida y devuelve 201', async () => {
      mockSend.mockResolvedValueOnce({});

      const metricPayload = {
        backend: 'wasm',
        totalMfaLatencyMs: 220,
        loginLatencyMs: 140,
        verifyOtpLatencyMs: 80,
        registerLatencyMs: 150,
        wasmSpeedup: 3.9,
        antiReplayRate: 100,
        detectionRate: 98.5,
        similarityThreshold: 0.8,
        totalDurationMs: 1800,
        httpStatusCounts: { '200': 1, '401': 2 },
      };

      const res = await handler({
        httpMethod: 'POST',
        body: JSON.stringify(metricPayload),
      });

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res.body);
      expect(data.message).toContain('exitosa');
      expect(data.id).toBeDefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
      const putCall = mockSend.mock.calls[0][0];
      expect(putCall.input.Item.httpStatusCounts).toEqual({ '200': 1, '401': 2 });
    });
  });

  describe('Métodos no soportados', () => {
    test('devuelve 405 para DELETE', async () => {
      const res = await handler({ httpMethod: 'DELETE' });
      expect(res.statusCode).toBe(405);
    });
  });
});
