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

async function persist(sqlDb) {
  const bytes = sqlDb.export();
  await idbSet(IDB_KEY, bytes);
}

async function openDb() {
  const SQL = await initSqlJs({ locateFile: () => '/assets/sql-wasm.wasm' });
  const saved = await idbGet(IDB_KEY);
  const sqlDb = saved ? new SQL.Database(saved) : new SQL.Database();
  sqlDb.run(SCHEMA_SQL);

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

const TABLES = ['shops', 'items', 'shop_item_prices', 'bills', 'bill_entries', 'payments'];

export async function exportBackupJson() {
  const sqlDb = await getDb();
  const tables = {};
  for (const table of TABLES) {
    tables[table] = execToObjects(sqlDb, `SELECT * FROM ${table}`);
  }
  return { format: 'debt-tracker-backup', version: 1, exportedAt: new Date().toISOString(), tables };
}
