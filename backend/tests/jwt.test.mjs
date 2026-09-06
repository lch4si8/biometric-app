import { signToken, verifyToken, buildSessionCookie } from '../src/lib/jwt.mjs';

const VALID_SECRET = 'super-secret-key-for-testing-only-32chars';
const TEST_EMAIL = 'user@test.com';

describe('JWT utilities', () => {
  describe('signToken', () => {
    test('genera un string con formato JWT', () => {
      const token = signToken(TEST_EMAIL, VALID_SECRET);
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    test('el payload contiene sub = email y iat', () => {
      const token = signToken(TEST_EMAIL, VALID_SECRET);
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
      expect(payload.sub).toBe(TEST_EMAIL);
      expect(typeof payload.iat).toBe('number');
      expect(typeof payload.exp).toBe('number');
    });

    test('exp - iat ≈ 3600 para expiración de 1h', () => {
      const token = signToken(TEST_EMAIL, VALID_SECRET, '1h');
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
      const diff = payload.exp - payload.iat;
      expect(diff).toBeGreaterThanOrEqual(3598);
      expect(diff).toBeLessThanOrEqual(3602);
    });

    test('lanza Error si el secreto es demasiado corto', () => {
      expect(() => signToken(TEST_EMAIL, 'short')).toThrow(Error);
    });
  });
  describe('verifyToken', () => {
    test('verifica y decodifica un token válido', () => {
      const token = signToken(TEST_EMAIL, VALID_SECRET);
      const payload = verifyToken(token, VALID_SECRET);
      expect(payload.sub).toBe(TEST_EMAIL);
    });

    test('lanza JsonWebTokenError con secreto incorrecto', () => {
      const token = signToken(TEST_EMAIL, VALID_SECRET);
      expect(() => verifyToken(token, 'wrong-secret-key-for-testing-1')).toThrow();
    });

    test('lanza error si el token está manipulado', () => {
      const token = signToken(TEST_EMAIL, VALID_SECRET);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyToken(tampered, VALID_SECRET)).toThrow();
    });
  });

  describe('buildSessionCookie', () => {
    const token = 'test.jwt.token';

    test('en producción incluye HttpOnly, Secure y SameSite=Strict', () => {
      const cookie = buildSessionCookie(token, true);
      expect(cookie).toContain(`token=${token}`);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
    });

    test('en desarrollo (isSecure=false) omite el flag Secure', () => {
      const cookie = buildSessionCookie(token, false);
      expect(cookie).not.toContain('Secure');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
    });

    test('incluye Max-Age=3600 y Path=/', () => {
      const cookie = buildSessionCookie(token, true);
      expect(cookie).toContain('Max-Age=3600');
      expect(cookie).toContain('Path=/');
    });
  });
});
