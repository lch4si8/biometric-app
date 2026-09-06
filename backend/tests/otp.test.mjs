import { generateOtp, hashOtp, otpTtlTimestamp } from '../src/lib/otp.mjs';
import { createHash } from 'node:crypto';

describe('OTP utilities', () => {
  describe('generateOtp', () => {
    test('genera exactamente 6 caracteres numéricos', () => {
      const otp = generateOtp();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    test('genera valores siempre en el rango [100000, 999999]', () => {
      for (let i = 0; i < 100; i++) {
        const n = parseInt(generateOtp(), 10);
        expect(n).toBeGreaterThanOrEqual(100000);
        expect(n).toBeLessThanOrEqual(999999);
      }
    });

    test('genera valores distintos en ejecuciones consecutivas (no determinista)', () => {
      const set = new Set(Array.from({ length: 20 }, () => generateOtp()));
      expect(set.size).toBeGreaterThan(1);
    });
  });

  describe('hashOtp', () => {
    test('produce un hash SHA-256 hexadecimal de 64 caracteres', () => {
      const hash = hashOtp('123456');
      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    test('es determinista: mismo input → mismo hash', () => {
      const otp = '987654';
      expect(hashOtp(otp)).toBe(hashOtp(otp));
    });

    test('coincide con la implementación nativa SHA-256 de Node.js', () => {
      const otp = '543210';
      const expected = createHash('sha256').update(otp, 'utf8').digest('hex');
      expect(hashOtp(otp)).toBe(expected);
    });

    test('hashes distintos para OTPs distintos (sin colisiones en prueba)', () => {
      const hashes = new Set(['123456', '654321', '111111', '999999'].map(hashOtp));
      expect(hashes.size).toBe(4);
    });
  });

  describe('otpTtlTimestamp', () => {
    test('retorna un timestamp Unix en segundos mayor al tiempo actual', () => {
      const now = Math.floor(Date.now() / 1000);
      const ttl = otpTtlTimestamp(120);
      expect(ttl).toBeGreaterThan(now);
    });

    test('respeta el TTL solicitado (±1s de margen de ejecución)', () => {
      const before = Math.floor(Date.now() / 1000);
      const ttl = otpTtlTimestamp(120);
      const after = Math.floor(Date.now() / 1000);
      expect(ttl).toBeGreaterThanOrEqual(before + 120);
      expect(ttl).toBeLessThanOrEqual(after + 120);
    });

    test('usa 120s como valor por defecto', () => {
      const now = Math.floor(Date.now() / 1000);
      const ttl = otpTtlTimestamp();
      expect(ttl - now).toBeGreaterThanOrEqual(119);
      expect(ttl - now).toBeLessThanOrEqual(121);
    });
  });
});
