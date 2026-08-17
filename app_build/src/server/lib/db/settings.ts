import { db } from "./connection";

export const getSetting = (key: string, collectionName: string = "global"): string | null => {
  const query = db.query("SELECT value FROM settings WHERE key = $key AND collection_name = $col");
  const result = query.get({ $key: key, $col: collectionName }) as { value: string } | null;
  return result ? result.value : null;
};

export const setSetting = (key: string, value: string, collectionName: string = "global") => {
  const query = db.query(`
 INSERT INTO settings (key, collection_name, value) 
 VALUES ($key, $col, $value) 
 ON CONFLICT(key, collection_name) DO UPDATE SET 
 value = excluded.value;
 `);
  query.run({ $key: key, $col: collectionName, $value: value });
};

export const getAllSettings = (collectionName: string = "global"): Record<string, string> => {
  const query = db.query("SELECT * FROM settings WHERE collection_name = $col");
  const results = query.all({ $col: collectionName }) as { key: string; value: string }[];

  const settings: Record<string, string> = {};
  for (const row of results) {
    settings[row.key] = row.value;
  }
  return settings;
};

export const getActiveCollection = (): string => {
  return getSetting("ACTIVE_COLLECTION_NAME", "global") || "default";
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
