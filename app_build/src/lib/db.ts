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
    is_starred BOOLEAN DEFAULT 0,
    selected_example TEXT DEFAULT NULL,
    status_code INTEGER DEFAULT 200,
    latency_ms INTEGER DEFAULT 0,
    path_params_overrides TEXT DEFAULT NULL
  );
`);

try {
  db.exec(`ALTER TABLE mock_states ADD COLUMN is_starred BOOLEAN DEFAULT 0;`);
} catch (_e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE mock_states ADD COLUMN selected_example TEXT DEFAULT NULL;`);
} catch (_e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE mock_states ADD COLUMN status_code INTEGER DEFAULT 200;`);
} catch (_e) {
}

try {
  db.exec(`ALTER TABLE mock_states ADD COLUMN latency_ms INTEGER DEFAULT 0;`);
} catch (_e) {
}

try {
  db.exec(`ALTER TABLE mock_states ADD COLUMN path_params_overrides TEXT DEFAULT NULL;`);
} catch (_e) {
}

// Create scenarios table
db.exec(`
  CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    name TEXT,
    actions TEXT
  );
`);

export interface DBMockState {
  request_id: string;
  is_mocked: number;
  payload: string;
  is_starred: number;
  selected_example: string | null;
  status_code: number;
  latency_ms: number;
  path_params_overrides: string | null;
}

export const getMockStates = (): Record<string, { isMocked: boolean, payload: string, isStarred: boolean, selectedExample: string | null, statusCode: number, latencyMs: number, pathParamsOverrides: Record<string, string> }> => {
  const query = db.query("SELECT * FROM mock_states");
  const results = query.all() as DBMockState[];
  
  const states: Record<string, { isMocked: boolean, payload: string, isStarred: boolean, selectedExample: string | null, statusCode: number, latencyMs: number, pathParamsOverrides: Record<string, string> }> = {};
  for (const row of results) {
    states[row.request_id] = {
      isMocked: row.is_mocked === 1,
      payload: row.payload,
      isStarred: row.is_starred === 1,
      selectedExample: row.selected_example,
      statusCode: row.status_code ?? 200,
      latencyMs: row.latency_ms ?? 0,
      pathParamsOverrides: row.path_params_overrides ? JSON.parse(row.path_params_overrides) : {}
    };
  }
  return states;
};

export const updateMockState = (requestId: string, isMocked: boolean, payload: string, isStarred?: boolean, selectedExample?: string | null, statusCode?: number, latencyMs?: number, pathParamsOverrides?: Record<string, string>) => {
  if (isStarred !== undefined) {
    const query = db.query(`
      INSERT INTO mock_states (request_id, is_mocked, payload, is_starred, selected_example, status_code, latency_ms, path_params_overrides) 
      VALUES ($id, $isMocked, $payload, $isStarred, $selectedExample, $statusCode, $latencyMs, $pathParamsOverrides) 
      ON CONFLICT(request_id) DO UPDATE SET 
        is_mocked = excluded.is_mocked,
        payload = excluded.payload,
        is_starred = excluded.is_starred,
        selected_example = excluded.selected_example,
        status_code = excluded.status_code,
        latency_ms = excluded.latency_ms,
        path_params_overrides = excluded.path_params_overrides;
    `);
    
    query.run({
      $id: requestId,
      $isMocked: isMocked ? 1 : 0,
      $payload: payload,
      $isStarred: isStarred ? 1 : 0,
      $selectedExample: selectedExample !== undefined ? selectedExample : null,
      $statusCode: statusCode !== undefined ? statusCode : 200,
      $latencyMs: latencyMs !== undefined ? latencyMs : 0,
      $pathParamsOverrides: pathParamsOverrides ? JSON.stringify(pathParamsOverrides) : null
    });
  } else {
    const query = db.query(`
      INSERT INTO mock_states (request_id, is_mocked, payload, is_starred, selected_example, status_code, latency_ms, path_params_overrides) 
      VALUES ($id, $isMocked, $payload, 0, $selectedExample, $statusCode, $latencyMs, $pathParamsOverrides) 
      ON CONFLICT(request_id) DO UPDATE SET 
        is_mocked = excluded.is_mocked,
        payload = excluded.payload,
        selected_example = excluded.selected_example,
        status_code = excluded.status_code,
        latency_ms = excluded.latency_ms,
        path_params_overrides = excluded.path_params_overrides;
    `);
    
    query.run({
      $id: requestId,
      $isMocked: isMocked ? 1 : 0,
      $payload: payload,
      $selectedExample: selectedExample !== undefined ? selectedExample : null,
      $statusCode: statusCode !== undefined ? statusCode : 200,
      $latencyMs: latencyMs !== undefined ? latencyMs : 0,
      $pathParamsOverrides: pathParamsOverrides ? JSON.stringify(pathParamsOverrides) : null
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

export interface DBScenario {
  id: string;
  name: string;
  actions: string; // JSON
}

export const getScenarios = (): { id: string, name: string, actions: Record<string, any> }[] => {
  const query = db.query("SELECT * FROM scenarios");
  const results = query.all() as DBScenario[];
  
  return results.map(row => ({
    id: row.id,
    name: row.name,
    actions: JSON.parse(row.actions || '[]')
  }));
};

export const createScenario = (id: string, name: string, actions: Record<string, any>) => {
  const query = db.query(`
    INSERT INTO scenarios (id, name, actions) 
    VALUES ($id, $name, $actions)
  `);
  query.run({ $id: id, $name: name, $actions: JSON.stringify(actions) });
};

export const updateScenario = (id: string, name: string, actions: Record<string, any>) => {
  const query = db.query(`
    UPDATE scenarios SET name = $name, actions = $actions WHERE id = $id
  `);
  query.run({ $id: id, $name: name, $actions: JSON.stringify(actions) });
};

export const deleteScenario = (id: string) => {
  const query = db.query("DELETE FROM scenarios WHERE id = $id");
  query.run({ $id: id });
};

export const applyScenarioActions = (actions: any[]) => {
  // Reset all to is_mocked = 0 first
  db.exec("UPDATE mock_states SET is_mocked = 0");
  
  // Then apply the specific ones
  for (const action of actions) {
    if (!action.requestId) continue;
    
    // Check if it exists
    const checkQuery = db.query("SELECT request_id FROM mock_states WHERE request_id = $id");
    const exists = checkQuery.get({ $id: action.requestId });
    
    if (exists) {
      const updateQuery = db.query(`
        UPDATE mock_states SET 
          is_mocked = 1,
          payload = $payload,
          status_code = $statusCode,
          latency_ms = $latencyMs,
          selected_example = $selectedExample,
          path_params_overrides = $pathParamsOverrides
        WHERE request_id = $id
      `);
      updateQuery.run({
        $id: action.requestId,
        $payload: action.payload !== undefined ? action.payload : '{}',
        $statusCode: action.statusCode !== undefined ? action.statusCode : 200,
        $latencyMs: action.latencyMs !== undefined ? action.latencyMs : 0,
        $selectedExample: action.selectedExample !== undefined ? action.selectedExample : null,
        $pathParamsOverrides: action.pathParamsOverrides ? JSON.stringify(action.pathParamsOverrides) : null
      });
    } else {
      const insertQuery = db.query(`
        INSERT INTO mock_states (request_id, is_mocked, payload, is_starred, selected_example, status_code, latency_ms, path_params_overrides) 
        VALUES ($id, 1, $payload, 0, $selectedExample, $statusCode, $latencyMs, $pathParamsOverrides)
      `);
      insertQuery.run({
        $id: action.requestId,
        $payload: action.payload !== undefined ? action.payload : '{}',
        $statusCode: action.statusCode !== undefined ? action.statusCode : 200,
        $latencyMs: action.latencyMs !== undefined ? action.latencyMs : 0,
        $selectedExample: action.selectedExample !== undefined ? action.selectedExample : null,
        $pathParamsOverrides: action.pathParamsOverrides ? JSON.stringify(action.pathParamsOverrides) : null
      });
    }
  }
};

