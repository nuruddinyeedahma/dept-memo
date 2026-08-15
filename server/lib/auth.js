import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'token';
const SHORT_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day
const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

export function signToken(user, rememberMe) {
  const maxAge = rememberMe ? REMEMBER_MAX_AGE : SHORT_MAX_AGE;
  const token = jwt.sign(
    { sub: String(user._id), role: user.role, shopId: user.shopId ? String(user.shopId) : null },
    process.env.JWT_SECRET,
    { expiresIn: Math.floor(maxAge / 1000) }
  );
  return { token, maxAge };
}

export function setAuthCookie(res, token, maxAge) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, shopId: payload.shopId };
    next();
  } catch {
    return res.status(401).json({ error: 'invalid or expired session' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}
