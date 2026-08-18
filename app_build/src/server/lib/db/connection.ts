import { Database } from "bun:sqlite";
import { join } from "node:path";

// Initialize the SQLite database
const isTestEnv = process.env.NODE_ENV === "test";
const defaultDbPath = join(process.cwd(), ".echo-state.sqlite");
const dbPath = isTestEnv
  ? ":memory:"
  : process.env.ECHO_DATA_DIR
    ? join(process.env.ECHO_DATA_DIR, ".echo-state.sqlite")
    : defaultDbPath;
export const db = new Database(dbPath);
db.exec("PRAGMA journal_mode = WAL;");

export function safeJsonParse<T>(
  data: string | null | undefined,
  fallback: T,
): T {
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch (err) {
    console.error("JSON parse error on DB read:", err);
    return fallback;
  }
}

function migrateTable(
  tableName: string,
  newSchema: string,
  oldColumns: string[],
  newColumns: string[],
  defaultCollection: string,
) {
  // biome-ignore lint/suspicious/noExplicitAny: FIXME - needs proper typing
  const tableInfo = db.query(`PRAGMA table_info(${tableName})`).all() as any[];
  if (tableInfo.length > 0) {
    const hasCollectionName = tableInfo.some(
      (c) => c.name === "collection_name",
    );
    if (!hasCollectionName) {
      console.log(`Migrating table ${tableName} to include collection_name...`);
      db.exec(`ALTER TABLE ${tableName} RENAME TO old_${tableName}`);
      db.exec(newSchema);
      db.exec(
        `INSERT INTO ${tableName} (${newColumns.join(", ")}) SELECT ${oldColumns.join(", ")}, '${defaultCollection}' FROM old_${tableName}`,
      );
      db.exec(`DROP TABLE old_${tableName}`);
    } else {
      db.exec(newSchema);
    }
  } else {
    db.exec(newSchema);
  }
}

let defaultCol = "default";
try {
  const colQuery = db.query(
    "SELECT value FROM settings WHERE key = 'ACTIVE_COLLECTION_NAME'",
  );
  const res = colQuery.get() as { value: string } | null;
  if (res?.value) defaultCol = res.value;
} catch (_e) {
  // Table might not exist or other error
}

migrateTable(
  "settings",
  `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT,
    collection_name TEXT,
    value TEXT,
    PRIMARY KEY (key, collection_name)
  );
`,
  ["key", "value"],
  ["key", "value", "collection_name"],
  "global",
);

migrateTable(
  "mock_variants",
  `
  CREATE TABLE IF NOT EXISTS mock_variants (
    id TEXT,
    collection_name TEXT,
    request_id TEXT,
    name TEXT,
    is_mocked BOOLEAN DEFAULT 0,
    payload TEXT,
    selected_example TEXT DEFAULT NULL,
    status_code INTEGER DEFAULT 200,
    latency_ms INTEGER DEFAULT 0,
    path_params_overrides TEXT DEFAULT NULL,
    PRIMARY KEY (id, collection_name)
  );
`,
  [
    "id",
    "request_id",
    "name",
    "is_mocked",
    "payload",
    "selected_example",
    "status_code",
    "latency_ms",
    "path_params_overrides",
  ],
  [
    "id",
    "request_id",
    "name",
    "is_mocked",
    "payload",
    "selected_example",
    "status_code",
    "latency_ms",
    "path_params_overrides",
    "collection_name",
  ],
  defaultCol,
);

migrateTable(
  "request_meta",
  `
  CREATE TABLE IF NOT EXISTS request_meta (
    request_id TEXT,
    collection_name TEXT,
    is_starred BOOLEAN DEFAULT 0,
    PRIMARY KEY (request_id, collection_name)
  );
`,
  ["request_id", "is_starred"],
  ["request_id", "is_starred", "collection_name"],
  defaultCol,
);

migrateTable(
  "scenarios",
  `
  CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT,
    collection_name TEXT,
    name TEXT,
    actions TEXT,
    PRIMARY KEY (id, collection_name)
  );
`,
  ["id", "name", "actions"],
  ["id", "name", "actions", "collection_name"],
  defaultCol,
);

migrateTable(
  "bruno_requests",
  `
  CREATE TABLE IF NOT EXISTS bruno_requests (
    id TEXT,
    collection_name TEXT,
    data TEXT,
    is_obsolete BOOLEAN DEFAULT 0,
    PRIMARY KEY (id, collection_name)
  );
`,
  ["id", "data", "is_obsolete"],
  ["id", "data", "is_obsolete", "collection_name"],
  defaultCol,
);

migrateTable(
  "bruno_folders",
  `
  CREATE TABLE IF NOT EXISTS bruno_folders (
    id TEXT,
    collection_name TEXT,
    data TEXT,
    is_obsolete BOOLEAN DEFAULT 0,
    PRIMARY KEY (id, collection_name)
  );
`,
  ["id", "data", "is_obsolete"],
  ["id", "data", "is_obsolete", "collection_name"],
  defaultCol,
);

migrateTable(
  "bruno_environments",
  `
  CREATE TABLE IF NOT EXISTS bruno_environments (
    name TEXT,
    collection_name TEXT,
    data TEXT,
    is_obsolete BOOLEAN DEFAULT 0,
    PRIMARY KEY (name, collection_name)
  );
`,
  ["name", "data", "is_obsolete"],
  ["name", "data", "is_obsolete", "collection_name"],
  defaultCol,
);
