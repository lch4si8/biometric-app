import jwt from 'jsonwebtoken';

/**
 * Firma un token JWT con el email del usuario como subject.
 *
 * @param {string} email       Email del usuario autenticado
 * @param {string} secret      Clave secreta (JWT_SECRET env var)
 * @param {string} expiresIn   Duración del token (default: '1h')
 * @returns {string}           Token JWT firmado
 */
export function signToken(email, secret, expiresIn = '1h') {
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET debe tener al menos 16 caracteres.');
  }

  return jwt.sign(
    {
      sub: email,
      iat: Math.floor(Date.now() / 1000),
    },
    secret,
    {
      expiresIn,
      algorithm: 'HS256',
    }
  );
}

/**
 * Verifica y decodifica un token JWT.
 *
 * @param {string} token   Token JWT a verificar
 * @param {string} secret  Clave secreta para verificación
 * @returns {object}       Payload decodificado
 */
export function verifyToken(token, secret) {
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

/**
 * Construye el valor del header Set-Cookie con flags de seguridad:
 *   HttpOnly  — el JS del cliente no puede leer la cookie
 *   Secure    — solo se transmite por HTTPS
 *   SameSite=Strict — protección CSRF
 *
 * @param {string}  token     Token JWT firmado
 * @param {boolean} isSecure  false en desarrollo local (HTTP)
 * @returns {string}          Valor completo del header Set-Cookie
 */
export function buildSessionCookie(token, isSecure = true) {
  const parts = [
    `token=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=3600',
  ];

  if (isSecure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}
