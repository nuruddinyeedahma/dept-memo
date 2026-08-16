import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Item from '../models/Item.js';
import { requireAuth, requireRole } from '../lib/auth.js';
import { outstandingDebtOf, getShopById, getShopsSummaryMap, summaryFor } from '../lib/domain.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

// ---------- Users ----------

function toUserDto(user) {
  return {
    id: user._id,
    username: user.username,
    role: user.role,
    shopId: user.shopId,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

router.get('/users', async (req, res) => {
  const users = await User.find().sort({ username: 1 });
  res.json(users.map(toUserDto));
});

router.post('/users', async (req, res) => {
  const { username, password, role, shopId, displayName } = req.body ?? {};
  if (!username?.trim() || !password || !role) {
    return res.status(400).json({ error: 'username, password, role are required' });
  }
  if (!['customer', 'shop', 'admin'].includes(role)) return res.status(400).json({ error: 'invalid role' });
  if (role === 'shop' && !shopId) return res.status(400).json({ error: 'shopId is required for role=shop' });

  const existing = await User.findOne({ username: username.trim() });
  if (existing) return res.status(400).json({ error: 'username already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username: username.trim(),
    passwordHash,
    role,
    shopId: role === 'shop' ? shopId : null,
    displayName: displayName?.trim() || '',
  });
  res.json(toUserDto(user));
});

router.patch('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  const { password, role, shopId, displayName } = req.body ?? {};
  if (password) user.passwordHash = await bcrypt.hash(password, 10);
  if (role !== undefined) {
    if (!['customer', 'shop', 'admin'].includes(role)) return res.status(400).json({ error: 'invalid role' });
    user.role = role;
  }
  if (shopId !== undefined) user.shopId = shopId || null;
  if (displayName !== undefined) user.displayName = displayName.trim();
  await user.save();
  res.json(toUserDto(user));
});

router.delete('/users/:id', async (req, res) => {
  await User.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

// ---------- Shops ----------

router.get('/shops', async (req, res) => {
  const [shops, maps] = await Promise.all([Shop.find().sort({ name: 1 }), getShopsSummaryMap()]);
  res.json(
    shops.map((shop) => ({
      id: shop._id,
      name: shop.name,
      phone: shop.phone,
      note: shop.note,
      ...summaryFor(shop._id, maps),
    }))
  );
});

function toShopDto(shop) {
  return { id: shop._id, name: shop.name, phone: shop.phone, note: shop.note };
}

router.post('/shops', async (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  const existing = await Shop.findOne({ name });
  if (existing) return res.status(400).json({ error: 'shop name already exists' });
  res.json(toShopDto(await Shop.create({ name })));
});

router.patch('/shops/:shopId', async (req, res) => {
  const shop = await getShopById(req.params.shopId);
  const { name, phone, note } = req.body ?? {};
  if (name !== undefined) shop.name = String(name).trim();
  if (phone !== undefined) shop.phone = String(phone).trim() || null;
  if (note !== undefined) shop.note = String(note).trim() || null;
  await shop.save();
  res.json(toShopDto(shop));
});

router.delete('/shops/:shopId', async (req, res) => {
  const shop = await getShopById(req.params.shopId);
  if ((await outstandingDebtOf(shop._id)) !== 0) {
    return res.status(400).json({ error: 'shop still has outstanding debt' });
  }
  await Shop.deleteOne({ _id: shop._id });
  res.json({ ok: true });
});

// ---------- Items ----------

function toItemDto(item) {
  return {
    id: item._id,
    name: item.name,
    defaultPrice: item.defaultPrice,
    category: item.category,
    active: item.active,
    shopIds: item.shopIds,
    isGlobal: item.shopIds.length === 0,
  };
}

router.get('/items', async (req, res) => {
  const items = await Item.find().sort({ name: 1 });
  res.json(items.map(toItemDto));
});

router.post('/items', async (req, res) => {
  const { name, defaultPrice, category } = req.body ?? {};
  const trimmed = name?.trim();
  const price = Number(defaultPrice);
  if (!trimmed || !Number.isFinite(price) || price < 0) {
    return res.status(400).json({ error: 'name and defaultPrice are required' });
  }
  const existing = await Item.findOne({ name: trimmed });
  if (existing) return res.status(400).json({ error: 'item name already exists' });
  const item = await Item.create({ name: trimmed, defaultPrice: price, category: category?.trim() || null });
  res.json(toItemDto(item));
});

router.patch('/items/:id', async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'item not found' });
  const { name, defaultPrice, category, active } = req.body ?? {};
  if (name !== undefined) item.name = String(name).trim();
  if (defaultPrice !== undefined) {
    const price = Number(defaultPrice);
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'invalid defaultPrice' });
    item.defaultPrice = price;
  }
  if (category !== undefined) item.category = String(category).trim() || null;
  if (active !== undefined) item.active = !!active;
  await item.save();
  res.json(toItemDto(item));
});

router.delete('/items/:id', async (req, res) => {
  await Item.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

router.put('/items/:id/shops', async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'item not found' });
  const ids = Array.isArray(req.body?.shopIds) ? [...new Set(req.body.shopIds)] : [];
  item.shopIds = ids;
  await item.save();
  res.json(toItemDto(item));
});

router.put('/shops/:shopId/prices/:itemId', async (req, res) => {
  await getShopById(req.params.shopId);
  const item = await Item.findById(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'item not found' });
  const price = Number(req.body?.price);
  if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'invalid price' });
  const idx = item.priceOverrides.findIndex((o) => String(o.shopId) === req.params.shopId);
  if (idx >= 0) item.priceOverrides[idx].price = price;
  else item.priceOverrides.push({ shopId: req.params.shopId, price });
  await item.save();
  res.json({ shopId: req.params.shopId, itemId: item._id, price });
});

router.post('/shops/:shopId/bulk-items', async (req, res) => {
  const shopId = req.params.shopId;
  await getShopById(shopId);
  const includedIds = Array.isArray(req.body?.includedItemIds) ? req.body.includedItemIds.map(String) : [];
  const includedSet = new Set(includedIds);

  const items = await Item.find();
  const shops = await Shop.find().select('_id');
  const allShopIds = shops.map((s) => String(s._id));

  for (const item of items) {
    const isGlobal = item.shopIds.length === 0;
    const currentlyIncluded = isGlobal || item.shopIds.some((id) => String(id) === String(shopId));
    const shouldInclude = includedSet.has(String(item._id));
    if (currentlyIncluded === shouldInclude) continue;

    if (shouldInclude) {
      item.shopIds = [...new Set([...item.shopIds.map(String), String(shopId)])];
    } else if (isGlobal) {
      item.shopIds = allShopIds.filter((id) => id !== String(shopId));
    } else {
      item.shopIds = item.shopIds.filter((id) => String(id) !== String(shopId));
    }
    await item.save();
  }
  res.json({ ok: true });
});

export default router;
