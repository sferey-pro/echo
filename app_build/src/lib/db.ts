import { Database } from "bun:sqlite";
import { join } from "path";

// Initialize the SQLite database
const dbPath = join(process.cwd(), '.echo-state.sqlite');
const db = new Database(dbPath);

// Create the table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS mock_states (
    request_id TEXT PRIMARY KEY,
    is_mocked BOOLEAN DEFAULT 0,
    payload TEXT,
    is_starred BOOLEAN DEFAULT 0
  );
`);

try {
  db.exec(`ALTER TABLE mock_states ADD COLUMN is_starred BOOLEAN DEFAULT 0;`);
} catch (_e) {
  // Column might already exist
}

export interface DBMockState {
  request_id: string;
  is_mocked: number;
  payload: string;
  is_starred: number;
}

export const getMockStates = (): Record<string, { isMocked: boolean, payload: string, isStarred: boolean }> => {
  const query = db.query("SELECT * FROM mock_states");
  const results = query.all() as DBMockState[];
  
  const states: Record<string, { isMocked: boolean, payload: string, isStarred: boolean }> = {};
  for (const row of results) {
    states[row.request_id] = {
      isMocked: row.is_mocked === 1,
      payload: row.payload,
      isStarred: row.is_starred === 1
    };
  }
  return states;
};

export const updateMockState = (requestId: string, isMocked: boolean, payload: string, isStarred?: boolean) => {
  // If isStarred is not provided, we should keep the existing value. 
  // We can do this by using COALESCE if we don't pass it, or fetch first.
  // The simplest is to use COALESCE with a parameter, but we need to know if we are updating it.
  
  if (isStarred !== undefined) {
    const query = db.query(`
      INSERT INTO mock_states (request_id, is_mocked, payload, is_starred) 
      VALUES ($id, $isMocked, $payload, $isStarred) 
      ON CONFLICT(request_id) DO UPDATE SET 
        is_mocked = excluded.is_mocked,
        payload = excluded.payload,
        is_starred = excluded.is_starred;
    `);
    
    query.run({
      $id: requestId,
      $isMocked: isMocked ? 1 : 0,
      $payload: payload,
      $isStarred: isStarred ? 1 : 0
    });
  } else {
    const query = db.query(`
      INSERT INTO mock_states (request_id, is_mocked, payload, is_starred) 
      VALUES ($id, $isMocked, $payload, 0) 
      ON CONFLICT(request_id) DO UPDATE SET 
        is_mocked = excluded.is_mocked,
        payload = excluded.payload;
    `);
    
    query.run({
      $id: requestId,
      $isMocked: isMocked ? 1 : 0,
      $payload: payload
    });
  }
};

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

export const getSetting = (key: string): string | null => {
  const query = db.query("SELECT value FROM settings WHERE key = $key");
  const result = query.get({ $key: key }) as { value: string } | null;
  return result ? result.value : null;
};

export const setSetting = (key: string, value: string) => {
  const query = db.query(`
    INSERT INTO settings (key, value) 
    VALUES ($key, $value) 
    ON CONFLICT(key) DO UPDATE SET 
      value = excluded.value;
  `);
  query.run({ $key: key, $value: value });
};

export const getAllSettings = (): Record<string, string> => {
  const query = db.query("SELECT * FROM settings");
  const results = query.all() as { key: string, value: string }[];
  
  const settings: Record<string, string> = {};
  for (const row of results) {
    settings[row.key] = row.value;
  }
  return settings;
};
