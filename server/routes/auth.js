import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from '../lib/auth.js';

const router = Router();

async function toUserDto(user) {
  const shop = user.shopId ? await Shop.findById(user.shopId).select('name') : null;
  return {
    id: user._id,
    username: user.username,
    role: user.role,
    shopId: user.shopId,
    displayName: user.displayName,
    shopName: shop?.name ?? null,
  };
}

router.post('/login', async (req, res) => {
  const { username, password, rememberMe } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const user = await User.findOne({ username: String(username).trim() });
  if (!user) return res.status(401).json({ error: 'invalid username or password' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid username or password' });

  const { token, maxAge } = signToken(user, !!rememberMe);
  setAuthCookie(res, token, maxAge);
  res.json(await toUserDto(user));
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ error: 'not authenticated' });
  res.json(await toUserDto(user));
});

export default router;
