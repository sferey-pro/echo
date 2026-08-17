import { Database } from "bun:sqlite";
import { join } from "path";
import type { ScenarioAction } from "../../client/lib/api";
import type { ApiRequest, BrunoFolder, BrunoEnvironment } from "../../shared/lib/parser";

// Initialize the SQLite database
const isTestEnv = process.env.NODE_ENV === 'test';
const dbPath = isTestEnv ? ':memory:' : join(__dirname, '..', '..', '.echo-state.sqlite');
const db = new Database(dbPath);

// Database migration: drop old mock_states and create mock_variants
db.exec(`
 CREATE TABLE IF NOT EXISTS mock_variants (
 id TEXT PRIMARY KEY,
 request_id TEXT,
 name TEXT,
 is_mocked BOOLEAN DEFAULT 0,
 payload TEXT,
 selected_example TEXT DEFAULT NULL,
 status_code INTEGER DEFAULT 200,
 latency_ms INTEGER DEFAULT 0,
 path_params_overrides TEXT DEFAULT NULL
 );
`);

db.exec(`
 CREATE TABLE IF NOT EXISTS request_meta (
 request_id TEXT PRIMARY KEY,
 is_starred BOOLEAN DEFAULT 0
 );
`);

// Optional: Drop old mock_states table to avoid confusion
try {
 db.exec("DROP TABLE mock_states");
} catch { /* ignore */ }

// Create scenarios table
db.exec(`
 CREATE TABLE IF NOT EXISTS scenarios (
 id TEXT PRIMARY KEY,
 name TEXT,
 actions TEXT
 );
`);

db.exec(`
 CREATE TABLE IF NOT EXISTS bruno_requests (
 id TEXT PRIMARY KEY,
 data TEXT,
 is_obsolete BOOLEAN DEFAULT 0
 );
`);

db.exec(`
 CREATE TABLE IF NOT EXISTS bruno_folders (
 id TEXT PRIMARY KEY,
 data TEXT,
 is_obsolete BOOLEAN DEFAULT 0
 );
`);

db.exec(`
 CREATE TABLE IF NOT EXISTS bruno_environments (
 name TEXT PRIMARY KEY,
 data TEXT,
 is_obsolete BOOLEAN DEFAULT 0
 );
`);

export interface DBMockVariant {
 id: string;
 request_id: string;
 name: string;
 is_mocked: number;
 payload: string;
 selected_example: string | null;
 status_code: number;
 latency_ms: number;
 path_params_overrides: string | null;
}

export interface MockVariantDef {
 id: string;
 name: string;
 isMocked: boolean;
 payload: string;
 selectedExample: string | null;
 statusCode: number;
 latencyMs: number;
 pathParamsOverrides: Record<string, string>;
}

export const getMockVariants = (): Record<string, MockVariantDef[]> => {
 const query = db.query("SELECT * FROM mock_variants");
 const results = query.all() as DBMockVariant[];
 
 const variants: Record<string, MockVariantDef[]> = {};
 for (const row of results) {
 if (!variants[row.request_id]) variants[row.request_id] = [];
 variants[row.request_id]!.push({
 id: row.id,
 name: row.name,
 isMocked: row.is_mocked === 1,
 payload: row.payload,
 selectedExample: row.selected_example,
 statusCode: row.status_code ?? 200,
 latencyMs: row.latency_ms ?? 0,
 pathParamsOverrides: row.path_params_overrides ? JSON.parse(row.path_params_overrides) : {}
 });
 }
 return variants;
};

export const getRequestMeta = (): Record<string, { isStarred: boolean }> => {
 const query = db.query("SELECT * FROM request_meta");
 const results = query.all() as { request_id: string, is_starred: number }[];
 const meta: Record<string, { isStarred: boolean }> = {};
 for (const row of results) {
 meta[row.request_id] = { isStarred: row.is_starred === 1 };
 }
 return meta;
};

export const updateRequestMeta = (requestId: string, isStarred: boolean) => {
 const query = db.query(`
 INSERT INTO request_meta (request_id, is_starred) 
 VALUES ($id, $isStarred) 
 ON CONFLICT(request_id) DO UPDATE SET 
 is_starred = excluded.is_starred;
 `);
 query.run({ $id: requestId, $isStarred: isStarred ? 1 : 0 });
};

export const createMockVariant = (id: string, requestId: string, name: string, isMocked: boolean, payload: string, selectedExample: string | null, statusCode: number, latencyMs: number, pathParamsOverrides: Record<string, string> | null) => {
 const query = db.query(`
 INSERT INTO mock_variants (id, request_id, name, is_mocked, payload, selected_example, status_code, latency_ms, path_params_overrides) 
 VALUES ($id, $reqId, $name, $isMocked, $payload, $selectedExample, $statusCode, $latencyMs, $pathParamsOverrides)
 `);
 query.run({
 $id: id,
 $reqId: requestId,
 $name: name,
 $isMocked: isMocked ? 1 : 0,
 $payload: payload,
 $selectedExample: selectedExample,
 $statusCode: statusCode,
 $latencyMs: latencyMs,
 $pathParamsOverrides: pathParamsOverrides ? JSON.stringify(pathParamsOverrides) : null
 });
};

export const updateMockVariant = (id: string, updates: Partial<MockVariantDef>) => {
 const currentQuery = db.query("SELECT * FROM mock_variants WHERE id = $id");
 const current = currentQuery.get({ $id: id }) as DBMockVariant;
 if (!current) {
 if (id.endsWith('-default')) {
 const requestId = id.replace(/-default$/, '');
 createMockVariant(
 id, requestId, updates.name || 'Default', updates.isMocked || false,
 updates.payload || '{}', updates.selectedExample || null,
 updates.statusCode || 200, updates.latencyMs || 0, updates.pathParamsOverrides || null
 );
 }
 return;
 }

 const query = db.query(`
 UPDATE mock_variants SET 
 name = $name,
 is_mocked = $isMocked,
 payload = $payload,
 selected_example = $selectedExample,
 status_code = $statusCode,
 latency_ms = $latencyMs,
 path_params_overrides = $pathParamsOverrides
 WHERE id = $id
 `);
 
 query.run({
 $id: id,
 $name: updates.name !== undefined ? updates.name : current.name,
 $isMocked: updates.isMocked !== undefined ? (updates.isMocked ? 1 : 0) : current.is_mocked,
 $payload: updates.payload !== undefined ? updates.payload : current.payload,
 $selectedExample: updates.selectedExample !== undefined ? updates.selectedExample : current.selected_example,
 $statusCode: updates.statusCode !== undefined ? updates.statusCode : current.status_code,
 $latencyMs: updates.latencyMs !== undefined ? updates.latencyMs : current.latency_ms,
 $pathParamsOverrides: updates.pathParamsOverrides !== undefined ? (updates.pathParamsOverrides ? JSON.stringify(updates.pathParamsOverrides) : null) : current.path_params_overrides
 });
};

export const deleteMockVariant = (id: string) => {
 const query = db.query("DELETE FROM mock_variants WHERE id = $id");
 query.run({ $id: id });
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

export interface DBScenario {
 id: string;
 name: string;
 actions: string; // JSON
}

export const getScenarios = (): { id: string, name: string, actions: ScenarioAction[] }[] => {
 const query = db.query("SELECT * FROM scenarios");
 const results = query.all() as DBScenario[];
 
 return results.map(row => ({
 id: row.id,
 name: row.name,
 actions: JSON.parse(row.actions || '[]')
 }));
};

export const createScenario = (id: string, name: string, actions: ScenarioAction[]) => {
 const query = db.query(`
 INSERT INTO scenarios (id, name, actions) 
 VALUES ($id, $name, $actions)
 `);
 query.run({ $id: id, $name: name, $actions: JSON.stringify(actions) });
};

export const updateScenario = (id: string, name: string, actions: ScenarioAction[]) => {
 const query = db.query(`
 UPDATE scenarios SET name = $name, actions = $actions WHERE id = $id
 `);
 query.run({ $id: id, $name: name, $actions: JSON.stringify(actions) });
};

export const deleteScenario = (id: string) => {
 const query = db.query("DELETE FROM scenarios WHERE id = $id");
 query.run({ $id: id });
};

export const applyScenarioActions = (actions: ScenarioAction[]) => {
 // Reset all to is_mocked = 0 first
 db.exec("UPDATE mock_variants SET is_mocked = 0");
 
 // Then apply the specific ones. 
 // Since ScenarioActions were originally tied to requestId, we need to find the "Default" variant or the first variant of that request and update it.
 // For robustness, we will find the first variant for each request_id and update it.
 for (const action of actions) {
 if (!action.requestId) continue;
 
 const checkQuery = db.query("SELECT id FROM mock_variants WHERE request_id = $id LIMIT 1");
 const exists = checkQuery.get({ $id: action.requestId }) as { id: string } | null;
 
 if (exists) {
 const updateQuery = db.query(`
 UPDATE mock_variants SET 
 is_mocked = 1,
 payload = $payload,
 status_code = $statusCode,
 latency_ms = $latencyMs,
 selected_example = $selectedExample,
 path_params_overrides = $pathParamsOverrides
 WHERE id = $variantId
 `);
 updateQuery.run({
 $variantId: exists.id,
 $payload: action.payload !== undefined ? action.payload : '{}',
 $statusCode: action.statusCode !== undefined ? action.statusCode : 200,
 $latencyMs: action.latencyMs !== undefined ? action.latencyMs : 0,
 $selectedExample: action.selectedExample !== undefined ? action.selectedExample : null,
 $pathParamsOverrides: action.pathParamsOverrides ? JSON.stringify(action.pathParamsOverrides) : null
 });
 } else {
 // Create a default variant if none exists
 const variantId = `${action.requestId}-default`;
 createMockVariant(variantId, action.requestId, "Générique", true, action.payload || '{}', action.selectedExample || null, action.statusCode || 200, action.latencyMs || 0, action.pathParamsOverrides || null);
 }
 }
};

export const resetDatabase = () => {
 db.exec("DELETE FROM mock_variants");
 db.exec("DELETE FROM request_meta");
 db.exec("DELETE FROM scenarios");
 db.exec("DELETE FROM settings");
 db.exec("DELETE FROM bruno_requests");
 db.exec("DELETE FROM bruno_folders");
 db.exec("DELETE FROM bruno_environments");
};

export const clearBrunoTables = () => {
 db.exec("DELETE FROM bruno_requests");
 db.exec("DELETE FROM bruno_folders");
 db.exec("DELETE FROM bruno_environments");
};

export const syncBrunoItemsToDb = (
 requests: ApiRequest[], 
 folders: BrunoFolder[], 
 environments: BrunoEnvironment[]
) => {
 const transaction = db.transaction(() => {
 db.exec("UPDATE bruno_requests SET is_obsolete = 1");
 db.exec("UPDATE bruno_folders SET is_obsolete = 1");
 db.exec("UPDATE bruno_environments SET is_obsolete = 1");

 const insertReq = db.query(`INSERT INTO bruno_requests (id, data, is_obsolete) VALUES ($id, $data, 0) ON CONFLICT(id) DO UPDATE SET data = excluded.data, is_obsolete = 0`);
 for (const r of requests) insertReq.run({ $id: r.id, $data: JSON.stringify(r) });

 const insertFolder = db.query(`INSERT INTO bruno_folders (id, data, is_obsolete) VALUES ($id, $data, 0) ON CONFLICT(id) DO UPDATE SET data = excluded.data, is_obsolete = 0`);
 for (const f of folders) insertFolder.run({ $id: f.id, $data: JSON.stringify(f) });

 const insertEnv = db.query(`INSERT INTO bruno_environments (name, data, is_obsolete) VALUES ($name, $data, 0) ON CONFLICT(name) DO UPDATE SET data = excluded.data, is_obsolete = 0`);
 for (const e of environments) insertEnv.run({ $name: e.name, $data: JSON.stringify(e) });
 });
 transaction();
};

export const getCollectionFromDb = () => {
 const reqRows = db.query("SELECT * FROM bruno_requests").all() as {id: string, data: string, is_obsolete: number}[];
 const folderRows = db.query("SELECT * FROM bruno_folders").all() as {id: string, data: string, is_obsolete: number}[];
 const envRows = db.query("SELECT * FROM bruno_environments").all() as {name: string, data: string, is_obsolete: number}[];

 const requests = reqRows.map(r => {
 const parsed = JSON.parse(r.data);
 parsed.isObsolete = r.is_obsolete === 1;
 return parsed as ApiRequest;
 });

 const folders = folderRows.map(f => {
 const parsed = JSON.parse(f.data);
 parsed.isObsolete = f.is_obsolete === 1;
 return parsed as BrunoFolder;
 });

 const environments = envRows.map(e => {
 const parsed = JSON.parse(e.data);
 parsed.isObsolete = e.is_obsolete === 1;
 return parsed as BrunoEnvironment;
 });

 return { requests, folders, environments };
};

export const cleanupObsoleteItems = () => {
 db.exec("DELETE FROM bruno_requests WHERE is_obsolete = 1");
 db.exec("DELETE FROM bruno_folders WHERE is_obsolete = 1");
 db.exec("DELETE FROM bruno_environments WHERE is_obsolete = 1");
 // Nettoyer aussi les mock_variants et request_meta devenus orphelins
 db.exec("DELETE FROM mock_variants WHERE request_id NOT IN (SELECT id FROM bruno_requests)");
 db.exec("DELETE FROM request_meta WHERE request_id NOT IN (SELECT id FROM bruno_requests)");
};


