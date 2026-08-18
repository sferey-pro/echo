import { beforeEach, describe, expect, it } from "bun:test";
import {
  applyScenarioActions,
  getCollectionFromDb,
  syncBrunoItemsToDb,
} from "./index";
import { resetDatabase } from "./settings";
import { getMockVariants } from "./variants";

describe("Database Complex operations", () => {
  beforeEach(() => {
    resetDatabase();
  });

  it("syncBrunoItemsToDb and getCollectionFromDb should handle full sync", () => {
    syncBrunoItemsToDb(
      [
        {
          id: "req1",
          folderId: "f1",
          name: "Req",
          method: "GET",
          url: "/url",
          examples: [],
        },
      ],
      [{ id: "f1", name: "Folder 1", children: [] }],
      [{ name: "Env 1", variables: [] }],
    );

    const collection = getCollectionFromDb();
    expect(collection.requests.length).toBe(1);
    expect(collection.folders.length).toBe(1);
    expect(collection.environments.length).toBe(1);
  });

  it("applyScenarioActions should upsert scenario variants", () => {
    applyScenarioActions([
      {
        requestId: "req1",
        payload: '{"ok":true}',
        statusCode: 200,
        latencyMs: 100,
      } as any,
      { requestId: "req1", payload: '{"ok":false}', statusCode: 400 } as any,
    ]);
    const variantsMap = getMockVariants();
    const variants = variantsMap.req1 || [];
    expect(variants.length).toBe(1);
    expect(variants[0]?.name).toBe("Scenario");
    expect(variants[0]?.payload).toBe('{"ok":false}');
    expect(variants[0]?.statusCode).toBe(400);
  });
});
