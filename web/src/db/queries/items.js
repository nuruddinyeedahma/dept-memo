import { all, get, run } from '../connection.js';

export async function getItems() {
  return all('SELECT id, name, default_price AS defaultPrice, category FROM items ORDER BY name');
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
  return get('SELECT id, name, default_price AS defaultPrice, category FROM items WHERE id = ?', [lastInsertRowid]);
}

export async function updateItem(id, patch) {
  const existing = await get('SELECT * FROM items WHERE id = ?', [id]);
  if (!existing) throw new Error('item not found');

  const name = patch.name !== undefined ? String(patch.name).trim() : existing.name;
  const price = patch.default_price !== undefined ? Number(patch.default_price) : existing.default_price;
  const category = patch.category !== undefined ? String(patch.category).trim() || null : existing.category;
  if (!name) throw new Error('name cannot be empty');
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('default_price must be a non-negative number');
  }

  await run('UPDATE items SET name = ?, default_price = ?, category = ? WHERE id = ?', [name, price, category, id]);
  return get('SELECT id, name, default_price AS defaultPrice, category FROM items WHERE id = ?', [id]);
}
