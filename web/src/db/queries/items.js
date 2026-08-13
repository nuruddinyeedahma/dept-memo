import { all, get, run } from '../connection.js';

export async function getItems() {
  const items = await all(
    'SELECT id, name, default_price AS defaultPrice, category, active FROM items ORDER BY name'
  );
  const links = await all('SELECT item_id AS itemId, shop_id AS shopId FROM item_shops');
  const byItem = new Map();
  for (const l of links) {
    if (!byItem.has(l.itemId)) byItem.set(l.itemId, []);
    byItem.get(l.itemId).push(l.shopId);
  }
  return items.map((item) => {
    const shopIds = byItem.get(item.id) ?? [];
    return { ...item, active: !!item.active, shopIds, isGlobal: shopIds.length === 0 };
  });
}

export async function getItemShopIds(itemId) {
  const rows = await all('SELECT shop_id AS shopId FROM item_shops WHERE item_id = ?', [itemId]);
  return rows.map((r) => r.shopId);
}

export async function setItemShops(itemId, shopIds) {
  const item = await get('SELECT id FROM items WHERE id = ?', [itemId]);
  if (!item) throw new Error('item not found');
  const ids = Array.isArray(shopIds) ? [...new Set(shopIds.map(Number).filter(Number.isInteger))] : [];
  await run('DELETE FROM item_shops WHERE item_id = ?', [itemId]);
  for (const shopId of ids) {
    await run('INSERT INTO item_shops (item_id, shop_id) VALUES (?, ?)', [itemId, shopId]);
  }
  return { itemId, shopIds: ids };
}

// Reconciles item_shops for every item against a shop-centric checked/unchecked list.
// A global item (no item_shops rows, visible everywhere) that gets unchecked for this
// shop is converted to an explicit list of every OTHER shop, since the schema has no
// way to represent "everywhere except here".
export async function bulkSetShopItems(shopId, includedItemIds) {
  const items = await getItems();
  const shops = await all('SELECT id FROM shops');
  const allShopIds = shops.map((s) => s.id);
  const includedSet = new Set((includedItemIds ?? []).map(Number));

  for (const item of items) {
    const currentlyIncluded = item.isGlobal || item.shopIds.includes(shopId);
    const shouldInclude = includedSet.has(item.id);
    if (currentlyIncluded === shouldInclude) continue;

    if (shouldInclude) {
      await setItemShops(item.id, [...new Set([...item.shopIds, shopId])]);
    } else if (item.isGlobal) {
      await setItemShops(item.id, allShopIds.filter((id) => id !== shopId));
    } else {
      await setItemShops(item.id, item.shopIds.filter((id) => id !== shopId));
    }
  }
}

export async function createItem(name, defaultPrice, category) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('name is required');
  }
  const price = Number(defaultPrice);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('default_price must be a non-negative number');
  }
  const categoryValue = category ? String(category).trim() || null : null;
  const existing = await get('SELECT id FROM items WHERE name = ?', [name.trim()]);
  if (existing) throw new Error('item name already exists');
  const { lastInsertRowid } = await run(
    'INSERT INTO items (name, default_price, category) VALUES (?, ?, ?)',
    [name.trim(), price, categoryValue]
  );
  return get('SELECT id, name, default_price AS defaultPrice, category, active FROM items WHERE id = ?', [
    lastInsertRowid,
  ]);
}

export async function updateItem(id, patch) {
  const existing = await get('SELECT * FROM items WHERE id = ?', [id]);
  if (!existing) throw new Error('item not found');

  const name = patch.name !== undefined ? String(patch.name).trim() : existing.name;
  const price = patch.default_price !== undefined ? Number(patch.default_price) : existing.default_price;
  const category = patch.category !== undefined ? String(patch.category).trim() || null : existing.category;
  const active = patch.active !== undefined ? (patch.active ? 1 : 0) : existing.active;
  if (!name) throw new Error('name cannot be empty');
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('default_price must be a non-negative number');
  }

  await run('UPDATE items SET name = ?, default_price = ?, category = ?, active = ? WHERE id = ?', [
    name,
    price,
    category,
    active,
    id,
  ]);
  return get('SELECT id, name, default_price AS defaultPrice, category, active FROM items WHERE id = ?', [id]);
}

export async function deleteItem(id) {
  const existing = await get('SELECT id FROM items WHERE id = ?', [id]);
  if (!existing) throw new Error('item not found');
  // Explicit cleanup instead of relying on ON DELETE CASCADE/SET NULL, which doesn't
  // reliably fire under sql.js's WASM sqlite build (see payments.js deletePayment).
  // bill_entries already snapshot item_name/unit_price at insert time, so past bills
  // are unaffected once item_id is cleared.
  await run('UPDATE bill_entries SET item_id = NULL WHERE item_id = ?', [id]);
  await run('DELETE FROM shop_item_prices WHERE item_id = ?', [id]);
  await run('DELETE FROM item_shops WHERE item_id = ?', [id]);
  await run('DELETE FROM items WHERE id = ?', [id]);
}
