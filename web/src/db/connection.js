import initSqlJs from 'sql.js';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { SCHEMA_SQL } from './schema.js';
import { seedIfEmpty } from './seed.js';

const IDB_KEY = 'debtdb-sqlite-bytes';

let dbPromise = null;

function execToObjects(sqlDb, sql, params = []) {
  const res = sqlDb.exec(sql, params);
  if (!res.length) return [];
  const { columns, values } = res[0];
  return values.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

// CREATE TABLE IF NOT EXISTS in SCHEMA_SQL only handles brand-new tables; existing
// databases (persisted in IndexedDB from before a column was added) need an explicit
// ALTER TABLE to catch up.
function migrate(sqlDb) {
  const cols = execToObjects(sqlDb, 'PRAGMA table_info(items)').map((r) => r.name);
  if (!cols.includes('active')) {
    sqlDb.run('ALTER TABLE items ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
  }
}

async function persist(sqlDb) {
  const bytes = sqlDb.export();
  await idbSet(IDB_KEY, bytes);
}

async function openDb() {
  const SQL = await initSqlJs({ locateFile: () => `${import.meta.env.BASE_URL}assets/sql-wasm.wasm` });
  const saved = await idbGet(IDB_KEY);
  const sqlDb = saved ? new SQL.Database(saved) : new SQL.Database();
  sqlDb.run(SCHEMA_SQL);
  migrate(sqlDb);

  await seedIfEmpty({
    get: async (sql, params) => execToObjects(sqlDb, sql, params)[0],
    run: async (sql, params) => {
      sqlDb.run(sql, params);
      const idRow = execToObjects(sqlDb, 'SELECT last_insert_rowid() AS id')[0];
      return { lastInsertRowid: idRow?.id, changes: sqlDb.getRowsModified() };
    },
  });

  await persist(sqlDb);
  return sqlDb;
}

function getDb() {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

export async function all(sql, params = []) {
  const sqlDb = await getDb();
  return execToObjects(sqlDb, sql, params);
}

export async function get(sql, params = []) {
  return (await all(sql, params))[0];
}

export async function run(sql, params = []) {
  const sqlDb = await getDb();
  sqlDb.run(sql, params);
  const idRow = execToObjects(sqlDb, 'SELECT last_insert_rowid() AS id')[0];
  const result = { lastInsertRowid: idRow?.id, changes: sqlDb.getRowsModified() };
  await persist(sqlDb);
  return result;
}

export async function exec(sql) {
  const sqlDb = await getDb();
  sqlDb.run(sql);
  await persist(sqlDb);
}

const TABLES = ['shops', 'items', 'item_shops', 'shop_item_prices', 'bills', 'bill_entries', 'payments'];

// Insert order must respect foreign keys (parents before children); delete order is the reverse.
const TABLE_ORDER = ['shops', 'items', 'item_shops', 'shop_item_prices', 'payments', 'bills', 'bill_entries'];

export async function exportBackupJson() {
  const sqlDb = await getDb();
  const tables = {};
  for (const table of TABLES) {
    tables[table] = execToObjects(sqlDb, `SELECT * FROM ${table}`);
  }
  return { format: 'debt-tracker-backup', version: 1, exportedAt: new Date().toISOString(), tables };
}

export async function importBackupJson(backup) {
  if (!backup || backup.format !== 'debt-tracker-backup' || typeof backup.tables !== 'object') {
    throw new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลที่ถูกต้อง');
  }
  const sqlDb = await getDb();
  sqlDb.run('BEGIN TRANSACTION');
  try {
    for (const table of [...TABLE_ORDER].reverse()) {
      sqlDb.run(`DELETE FROM ${table}`);
    }
    for (const table of TABLE_ORDER) {
      for (const row of backup.tables[table] ?? []) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(',');
        sqlDb.run(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`, cols.map((c) => row[c]));
      }
    }
    sqlDb.run('COMMIT');
  } catch (err) {
    sqlDb.run('ROLLBACK');
    throw err;
  }
  await persist(sqlDb);
}
