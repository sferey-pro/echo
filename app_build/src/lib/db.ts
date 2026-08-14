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
    payload TEXT
  );
`);

export interface DBMockState {
  request_id: string;
  is_mocked: number;
  payload: string;
}

export const getMockStates = (): Record<string, { isMocked: boolean, payload: string }> => {
  const query = db.query("SELECT * FROM mock_states");
  const results = query.all() as DBMockState[];
  
  const states: Record<string, { isMocked: boolean, payload: string }> = {};
  for (const row of results) {
    states[row.request_id] = {
      isMocked: row.is_mocked === 1,
      payload: row.payload
    };
  }
  return states;
};

export const updateMockState = (requestId: string, isMocked: boolean, payload: string) => {
  const query = db.query(`
    INSERT INTO mock_states (request_id, is_mocked, payload) 
    VALUES ($id, $isMocked, $payload) 
    ON CONFLICT(request_id) DO UPDATE SET 
      is_mocked = excluded.is_mocked,
      payload = excluded.payload;
  `);
  
  query.run({
    $id: requestId,
    $isMocked: isMocked ? 1 : 0,
    $payload: payload
  });
};
