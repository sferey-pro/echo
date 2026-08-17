import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test";
import { handleRepositoriesRoute } from "./repositories";
import { resetDatabase, setSetting } from "../lib/db";
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";

describe("API Route: /api/repositories", () => {
  beforeEach(() => {
    mock.restore();
    resetDatabase();
  });

  it("should return repositories and activeRepository on GET", async () => {
    spyOn(fs, "existsSync").mockReturnValue(true);
    spyOn(fsPromises, "readdir").mockResolvedValue([
      { name: "repo1", isDirectory: () => true },
      { name: "repo2", isDirectory: () => true },
      { name: "file.txt", isDirectory: () => false },
    ] as any);

    setSetting("ACTIVE_COLLECTION_NAME", "repo1");

    const req = new Request("http://localhost:3000/api/repositories", {
      method: "GET",
    });
    const url = new URL(req.url);
    const res = await handleRepositoriesRoute(req, url);
    expect(res).not.toBeNull();

    const data = await res?.json();
    expect(data.repositories).toEqual(["repo1", "repo2"]);
    expect(data.activeRepository).toBe("repo1");
  });

  it("should fail on clone with invalid URL (Argument Injection protection)", async () => {
    const req = new Request("http://localhost:3000/api/repositories/clone", {
      method: "POST",
      body: JSON.stringify({ repoUrl: "--upload-pack=touch /tmp/pwned" }),
    });
    const res = await handleRepositoriesRoute(req, new URL(req.url));
    expect(res?.status).toBe(400);
    expect(await res?.text()).toContain("Invalid URL");
  });

  it("should handle activation POST", async () => {
    // Setup mocks to prevent actual side effects
    const mockBunSpawn = spyOn(Bun, "spawn").mockImplementation(
      () =>
        ({
          exited: Promise.resolve(),
          exitCode: 0,
        }) as any,
    );

    const req = new Request("http://localhost:3000/api/repositories/active", {
      method: "POST",
      body: JSON.stringify({ name: "my-repo" }),
    });
    const res = await handleRepositoriesRoute(req, new URL(req.url));
    expect(res?.status).toBe(200);

    const data = await res?.json();
    expect(data.success).toBe(true);
  });
});
