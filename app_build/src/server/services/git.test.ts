import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { resetDatabase, setSetting } from "../lib/db/index";
import { getRepoPath } from "./git";

describe("Service: git", () => {
  beforeEach(() => {
    resetDatabase();
    process.env.REPO_PATH = "";
  });

  it("should return empty repo path if not set", () => {
    const path = getRepoPath();
    expect(path).toContain(".empty");
  });

  it("should return process.env.REPO_PATH if set", () => {
    process.env.REPO_PATH = "my-repo";
    const path = getRepoPath();
    expect(path).toContain("my-repo");
  });

  it("should prioritize ACTIVE_COLLECTION_NAME setting over env", () => {
    process.env.REPO_PATH = "my-repo";
    setSetting("ACTIVE_COLLECTION_NAME", "my-collection");
    const path = getRepoPath();
    expect(path).toContain("my-collection");
  });
});

import { gitSyncStatus, runSync, updateBackgroundTasks } from "./git";

describe("Service: git (operations)", () => {
  // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
  let originalSpawn: any;
  // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
  let existsSyncMock: any;
  // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
  let watchMock: any;

  // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
  let watcherCallback: any;

  beforeEach(() => {
    originalSpawn = Bun.spawn;
    existsSyncMock = mock(() => true);
    // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
    watchMock = mock((_p: any, _opts: any, cb: any) => {
      watcherCallback = cb;
      return { close: mock(() => {}) };
    });
    mock.module("fs", () => ({ existsSync: existsSyncMock, watch: watchMock }));
  });

  afterEach(() => {
    Bun.spawn = originalSpawn;
  });

  it("runSync should handle git fetch success", async () => {
    Bun.spawn = mock(() => ({
      exited: Promise.resolve(),
      exitCode: 0,
      stdout: new Blob(["0"]), // 0 commits behind
      stderr: new Blob([]),
      // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
    })) as any;

    await runSync();
    expect(gitSyncStatus.isSynced).toBe(true);
    expect(gitSyncStatus.commitsBehind).toBe(0);
    expect(gitSyncStatus.error).toBe("");
  });

  it("runSync should handle missing git repo", async () => {
    existsSyncMock.mockImplementation(() => false);
    await runSync();
    expect(gitSyncStatus.isSynced).toBe(false);
    expect(gitSyncStatus.error).toBe("Aucun dépôt Git trouvé.");
  });

  it("updateBackgroundTasks should setup watcher", () => {
    existsSyncMock.mockImplementation(() => true);
    expect(() => updateBackgroundTasks(true)).not.toThrow();
    expect(watcherCallback).toBeDefined();
    expect(() => watcherCallback("change", "file.bru")).not.toThrow();
  });
});
