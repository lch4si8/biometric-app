import { cosineSimilarity } from '../src/lib/cosine-similarity.mjs';

describe('cosineSimilarity', () => {
  test('vectores idénticos → 1.0', () => {
    const v = [1, 0, 0.5, -0.3, 0.8];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 10);
  });

  test('vectores ortogonales → 0.0', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 10);
  });

  test('vectores opuestos → -1.0', () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 10);
  });

  test('caso con 128 dimensiones', () => {
    const a = Array.from({ length: 128 }, (_, i) => Math.sin(i));
    const b = Array.from({ length: 128 }, (_, i) => Math.sin(i));
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 8);
  });

  test('vectores similares superan umbral 0.8', () => {
    const a = Array.from({ length: 128 }, () => Math.random());
    const noise = 0.03;
    const b = a.map((v) => v + (Math.random() - 0.5) * noise);
    const sc = cosineSimilarity(a, b);
    expect(sc).toBeGreaterThan(0.8);
  });

  test('vectores muy distintos caen bajo 0.8', () => {
    const a = Array.from({ length: 128 }, () => Math.random());
    const b = Array.from({ length: 128 }, () => -Math.random());
    const sc = cosineSimilarity(a, b);
    expect(sc).toBeLessThan(0.8);
  });

  test('lanza TypeError si los argumentos no son arrays', () => {
    expect(() => cosineSimilarity('a', [1, 2])).toThrow(TypeError);
    expect(() => cosineSimilarity([1, 2], null)).toThrow(TypeError);
  });

  test('lanza RangeError si los vectores tienen longitudes distintas', () => {
    expect(() => cosineSimilarity([1, 2, 3], [1, 2])).toThrow(RangeError);
  });

  test('lanza RangeError si los vectores están vacíos', () => {
    expect(() => cosineSimilarity([], [])).toThrow(RangeError);
  });

  test('lanza RangeError si el vector tiene magnitud cero', () => {
    expect(() => cosineSimilarity([0, 0, 0], [1, 2, 3])).toThrow(RangeError);
  });
});
