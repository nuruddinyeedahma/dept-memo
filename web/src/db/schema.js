export const SCHEMA_SQL = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    phone TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    default_price REAL NOT NULL,
    category TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shop_item_prices (
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    price REAL NOT NULL,
    PRIMARY KEY (shop_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS item_shops (
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, shop_id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY,
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK (amount > 0),
    paid_at TEXT NOT NULL DEFAULT (datetime('now')),
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY,
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('open','cleared')),
    imported INTEGER NOT NULL DEFAULT 0,
    opened_at TEXT,
    cleared_at TEXT,
    note TEXT,
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS bill_entries (
    id INTEGER PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
  );
`;
