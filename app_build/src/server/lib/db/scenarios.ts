import { db, safeJsonParse } from "./connection";
import type { ScenarioAction } from "../../../client/lib/api";
import { randomUUID } from "crypto";
import { getActiveCollection } from "./settings";

interface DBScenario {
  id: string;
  name: string;
  actions: string; // JSON
}

export const getScenarios = (): {
  id: string;
  name: string;
  actions: ScenarioAction[];
}[] => {
  const collectionName = getActiveCollection();
  const query = db.query("SELECT * FROM scenarios WHERE collection_name = $col");
  const results = query.all({ $col: collectionName }) as DBScenario[];

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    actions: safeJsonParse<ScenarioAction[]>(row.actions, []),
  }));
};

export const createScenario = (
  id: string,
  name: string,
  actions: ScenarioAction[],
) => {
  const collectionName = getActiveCollection();
  const query = db.query(`
 INSERT INTO scenarios (id, collection_name, name, actions) 
 VALUES ($id, $col, $name, $actions)
 `);
  query.run({ $id: id, $col: collectionName, $name: name, $actions: JSON.stringify(actions) });
};

export const updateScenario = (
  id: string,
  name: string,
  actions: ScenarioAction[],
) => {
  const collectionName = getActiveCollection();
  const query = db.query(`
 UPDATE scenarios SET name = $name, actions = $actions WHERE id = $id AND collection_name = $col
 `);
  query.run({ $id: id, $col: collectionName, $name: name, $actions: JSON.stringify(actions) });
};

export const deleteScenario = (id: string) => {
  const collectionName = getActiveCollection();
  const query = db.query("DELETE FROM scenarios WHERE id = $id AND collection_name = $col");
  query.run({ $id: id, $col: collectionName });
};

export const applyScenarioActions = (actions: ScenarioAction[]) => {
  const collectionName = getActiveCollection();
  for (const action of actions) {
    if (!action.requestId) continue;

    const variantId = `${action.requestId}-scenario`;

    const insertQuery = db.query(`
      INSERT INTO mock_variants 
      (id, collection_name, request_id, name, is_mocked, payload, status_code, latency_ms)
      VALUES ($id, $col, $reqId, $name, 1, $payload, $statusCode, $latencyMs)
      ON CONFLICT(id, collection_name) DO UPDATE SET
      request_id = excluded.request_id,
      name = excluded.name,
      is_mocked = 1,
      payload = excluded.payload,
      status_code = excluded.status_code,
      latency_ms = excluded.latency_ms
    `);

    insertQuery.run({
      $id: variantId,
      $col: collectionName,
      $reqId: action.requestId,
      $name: "Scenario",
      $payload: action.payload || "{}",
      $statusCode: action.statusCode || 200,
      $latencyMs: action.latencyMs || 0,
    });

    const updateQuery = db.query(`
      UPDATE mock_variants 
      SET is_mocked = 0 
      WHERE request_id = $reqId AND id != $id AND collection_name = $col
    `);
    updateQuery.run({ $reqId: action.requestId, $id: variantId, $col: collectionName });
  }
};
