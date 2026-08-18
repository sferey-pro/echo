import type { MockVariantDef } from "../../../shared/schemas";
import { pathParamsOverridesSchema } from "../../../shared/schemas";
import { db, safeJsonParse } from "./connection";
import { getActiveCollection } from "./settings";

interface DBMockVariant {
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

export const getMockVariants = (): Record<string, MockVariantDef[]> => {
  const collectionName = getActiveCollection();
  const query = db.query(
    "SELECT * FROM mock_variants WHERE collection_name = $col",
  );
  const results = query.all({ $col: collectionName }) as DBMockVariant[];

  const variants: Record<string, MockVariantDef[]> = {};
  for (const row of results) {
    if (!variants[row.request_id]) variants[row.request_id] = [];
    variants[row.request_id]?.push({
      id: row.id,
      name: row.name,
      isMocked: row.is_mocked === 1,
      payload: row.payload,
      selectedExample: row.selected_example,
      statusCode: row.status_code ?? 200,
      latencyMs: row.latency_ms ?? 0,
      pathParamsOverrides: safeJsonParse<Record<string, string>>(
        row.path_params_overrides,
        {},
        pathParamsOverridesSchema,
      ),
    });
  }
  return variants;
};

export const createMockVariant = (
  id: string,
  requestId: string,
  name: string,
  isMocked: boolean,
  payload: string,
  selectedExample: string | null,
  statusCode: number,
  latencyMs: number,
  pathParamsOverrides: Record<string, string> | null,
) => {
  const collectionName = getActiveCollection();
  const query = db.query(`
 INSERT INTO mock_variants (id, collection_name, request_id, name, is_mocked, payload, selected_example, status_code, latency_ms, path_params_overrides) 
 VALUES ($id, $col, $reqId, $name, $isMocked, $payload, $selectedExample, $statusCode, $latencyMs, $pathParamsOverrides)
 `);
  query.run({
    $id: id,
    $col: collectionName,
    $reqId: requestId,
    $name: name,
    $isMocked: isMocked ? 1 : 0,
    $payload: payload,
    $selectedExample: selectedExample,
    $statusCode: statusCode,
    $latencyMs: latencyMs,
    $pathParamsOverrides: pathParamsOverrides
      ? JSON.stringify(pathParamsOverrides)
      : null,
  });
};

export const updateMockVariant = (
  id: string,
  updates: Partial<MockVariantDef>,
) => {
  const collectionName = getActiveCollection();
  const currentQuery = db.query(
    "SELECT * FROM mock_variants WHERE id = $id AND collection_name = $col",
  );
  const current = currentQuery.get({
    $id: id,
    $col: collectionName,
  }) as DBMockVariant;
  if (!current) {
    if (id.endsWith("-default")) {
      const requestId = id.replace(/-default$/, "");
      createMockVariant(
        id,
        requestId,
        updates.name || "Default",
        updates.isMocked || false,
        updates.payload || "{}",
        updates.selectedExample || null,
        updates.statusCode || 200,
        updates.latencyMs || 0,
        updates.pathParamsOverrides || null,
      );
    }
    return;
  }

  const newName = updates.name !== undefined ? updates.name : current.name;
  const newIsMocked =
    updates.isMocked !== undefined ? updates.isMocked : current.is_mocked === 1;
  const newPayload =
    updates.payload !== undefined ? updates.payload : current.payload;
  const newSelectedExample =
    updates.selectedExample !== undefined
      ? updates.selectedExample
      : current.selected_example;
  const newStatusCode =
    updates.statusCode !== undefined ? updates.statusCode : current.status_code;
  const newLatencyMs =
    updates.latencyMs !== undefined ? updates.latencyMs : current.latency_ms;
  const newPathParamsOverrides =
    updates.pathParamsOverrides !== undefined
      ? updates.pathParamsOverrides
        ? JSON.stringify(updates.pathParamsOverrides)
        : null
      : current.path_params_overrides;

  const updateQuery = db.query(`
    UPDATE mock_variants 
    SET name = $name, 
        is_mocked = $isMocked, 
        payload = $payload, 
        selected_example = $selectedExample,
        status_code = $statusCode,
        latency_ms = $latencyMs,
        path_params_overrides = $pathParamsOverrides
    WHERE id = $id AND collection_name = $col
  `);

  updateQuery.run({
    $id: id,
    $col: collectionName,
    $name: newName,
    $isMocked: newIsMocked ? 1 : 0,
    $payload: newPayload,
    $selectedExample: newSelectedExample,
    $statusCode: newStatusCode,
    $latencyMs: newLatencyMs,
    $pathParamsOverrides: newPathParamsOverrides,
  });
};

export const deleteMockVariant = (id: string) => {
  const collectionName = getActiveCollection();
  const query = db.query(
    "DELETE FROM mock_variants WHERE id = $id AND collection_name = $col",
  );
  query.run({ $id: id, $col: collectionName });
};
