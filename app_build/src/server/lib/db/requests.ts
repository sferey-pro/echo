import type {
  ApiRequest,
  BrunoEnvironment,
  BrunoFolder,
} from "../../../shared/lib/parser";
import { db, safeJsonParse } from "./connection";
import { getActiveCollection } from "./settings";

export const getRequestMeta = (): Record<string, { isStarred: boolean }> => {
  const collectionName = getActiveCollection();
  const query = db.query(
    "SELECT * FROM request_meta WHERE collection_name = $col",
  );
  const results = query.all({ $col: collectionName }) as {
    request_id: string;
    is_starred: number;
  }[];
  const meta: Record<string, { isStarred: boolean }> = {};
  for (const row of results) {
    meta[row.request_id] = { isStarred: row.is_starred === 1 };
  }
  return meta;
};

export const updateRequestMeta = (requestId: string, isStarred: boolean) => {
  const collectionName = getActiveCollection();
  const query = db.query(`
 INSERT INTO request_meta (request_id, collection_name, is_starred) 
 VALUES ($id, $col, $isStarred) 
 ON CONFLICT(request_id, collection_name) DO UPDATE SET 
 is_starred = excluded.is_starred;
 `);
  query.run({
    $id: requestId,
    $col: collectionName,
    $isStarred: isStarred ? 1 : 0,
  });
};

export const clearBrunoTables = () => {
  const collectionName = getActiveCollection();
  db.query("DELETE FROM bruno_requests WHERE collection_name = $col").run({
    $col: collectionName,
  });
  db.query("DELETE FROM bruno_folders WHERE collection_name = $col").run({
    $col: collectionName,
  });
  db.query("DELETE FROM bruno_environments WHERE collection_name = $col").run({
    $col: collectionName,
  });
};

export const syncBrunoItemsToDb = (
  requests: ApiRequest[],
  folders: BrunoFolder[],
  environments: BrunoEnvironment[],
) => {
  const collectionName = getActiveCollection();
  const transaction = db.transaction(() => {
    db.query(
      "UPDATE bruno_requests SET is_obsolete = 1 WHERE collection_name = $col",
    ).run({ $col: collectionName });
    db.query(
      "UPDATE bruno_folders SET is_obsolete = 1 WHERE collection_name = $col",
    ).run({ $col: collectionName });
    db.query(
      "UPDATE bruno_environments SET is_obsolete = 1 WHERE collection_name = $col",
    ).run({ $col: collectionName });

    const insertReq = db.query(
      `INSERT INTO bruno_requests (id, collection_name, data, is_obsolete) VALUES ($id, $col, $data, 0) ON CONFLICT(id, collection_name) DO UPDATE SET data = excluded.data, is_obsolete = 0`,
    );
    for (const r of requests)
      insertReq.run({
        $id: r.id,
        $col: collectionName,
        $data: JSON.stringify(r),
      });

    const insertFolder = db.query(
      `INSERT INTO bruno_folders (id, collection_name, data, is_obsolete) VALUES ($id, $col, $data, 0) ON CONFLICT(id, collection_name) DO UPDATE SET data = excluded.data, is_obsolete = 0`,
    );
    for (const f of folders)
      insertFolder.run({
        $id: f.id,
        $col: collectionName,
        $data: JSON.stringify(f),
      });

    const insertEnv = db.query(
      `INSERT INTO bruno_environments (name, collection_name, data, is_obsolete) VALUES ($name, $col, $data, 0) ON CONFLICT(name, collection_name) DO UPDATE SET data = excluded.data, is_obsolete = 0`,
    );
    for (const e of environments)
      insertEnv.run({
        $name: e.name,
        $col: collectionName,
        $data: JSON.stringify(e),
      });
  });
  transaction();
};

export const getCollectionFromDb = () => {
  const collectionName = getActiveCollection();
  const reqRows = db
    .query("SELECT * FROM bruno_requests WHERE collection_name = $col")
    .all({ $col: collectionName }) as {
    id: string;
    data: string;
    is_obsolete: number;
  }[];
  const folderRows = db
    .query("SELECT * FROM bruno_folders WHERE collection_name = $col")
    .all({ $col: collectionName }) as {
    id: string;
    data: string;
    is_obsolete: number;
  }[];
  const envRows = db
    .query("SELECT * FROM bruno_environments WHERE collection_name = $col")
    .all({ $col: collectionName }) as {
    name: string;
    data: string;
    is_obsolete: number;
  }[];

  const requests: ApiRequest[] = [];
  for (const r of reqRows) {
    const parsed = safeJsonParse<ApiRequest | null>(r.data, null);
    if (parsed) {
      parsed.isObsolete = r.is_obsolete === 1;
      requests.push(parsed);
    }
  }

  const folders: BrunoFolder[] = [];
  for (const f of folderRows) {
    const parsed = safeJsonParse<BrunoFolder | null>(f.data, null);
    if (parsed) {
      parsed.isObsolete = f.is_obsolete === 1;
      folders.push(parsed);
    }
  }

  const environments: BrunoEnvironment[] = [];
  for (const e of envRows) {
    const parsed = safeJsonParse<BrunoEnvironment | null>(e.data, null);
    if (parsed) {
      (parsed as { isObsolete?: boolean }).isObsolete = e.is_obsolete === 1;
      environments.push(parsed);
    }
  }

  return { requests, folders, environments };
};

export const cleanupObsoleteItems = () => {
  const collectionName = getActiveCollection();
  db.query(
    "DELETE FROM bruno_requests WHERE is_obsolete = 1 AND collection_name = $col",
  ).run({ $col: collectionName });
  db.query(
    "DELETE FROM bruno_folders WHERE is_obsolete = 1 AND collection_name = $col",
  ).run({ $col: collectionName });
  db.query(
    "DELETE FROM bruno_environments WHERE is_obsolete = 1 AND collection_name = $col",
  ).run({ $col: collectionName });

  db.query(
    "DELETE FROM mock_variants WHERE collection_name = $col AND request_id NOT IN (SELECT id FROM bruno_requests WHERE collection_name = $col)",
  ).run({ $col: collectionName });

  db.query(
    "DELETE FROM request_meta WHERE collection_name = $col AND request_id NOT IN (SELECT id FROM bruno_requests WHERE collection_name = $col)",
  ).run({ $col: collectionName });
};
