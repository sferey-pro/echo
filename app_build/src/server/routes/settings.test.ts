import { describe, it, expect, beforeEach } from "bun:test";
import { handleSettingsRoute } from "./settings";
import { resetDatabase } from "../lib/db/index";
import { spyOn } from "bun:test";

import { mock } from "bun:test";
import * as gitServices from "../services/git";

describe("API Route: /api/settings", () => {
  beforeEach(() => {
    mock.restore();
    resetDatabase();
  });

  it("should return all settings on GET", async () => {
    const req = new Request("http://localhost:3000/api/settings", {
      method: "GET",
    });
    const url = new URL(req.url);
    const res = await handleSettingsRoute(req, url);
    expect(res).not.toBeNull();
    const data = await res?.json();
    expect(data).toBeTypeOf("object");
  });

  it("should update an allowed setting on POST", async () => {
    const req = new Request("http://localhost:3000/api/settings", {
      method: "POST",
      body: JSON.stringify({ key: "TARGET_API_URL", value: "http://test.com" }),
    });
    const url = new URL(req.url);
    const res = await handleSettingsRoute(req, url);
    expect(res?.status).toBe(200);
    const data = await res?.json();
    expect(data?.success).toBe(true);

    const getReq = new Request("http://localhost:3000/api/settings", {
      method: "GET",
    });
    const getRes = await handleSettingsRoute(getReq, new URL(getReq.url));
    const getData = await getRes?.json();
    expect(getData?.["TARGET_API_URL"]).toBe("http://test.com");
  });

  it("should return 400 for an invalid setting key", async () => {
    const req = new Request("http://localhost:3000/api/settings", {
      method: "POST",
      body: JSON.stringify({ key: "HACKED_KEY", value: "123" }),
    });
    const url = new URL(req.url);
    const res = await handleSettingsRoute(req, url);
    expect(res?.status).toBe(400);
  });

  it("should trigger updateBackgroundTasks for REPO_PATH and return 400 for bad request", async () => {
    const spy = spyOn(gitServices, "updateBackgroundTasks").mockImplementation(
      () => {},
    );
    const req = new Request("http://localhost/api/settings", {
      method: "POST",
      body: JSON.stringify({ key: "REPO_PATH", value: "a" }),
    });
    const res = await handleSettingsRoute(req, new URL(req.url));
    expect(res?.status).toBe(200);

    const badReq = new Request("http://localhost/api/settings", {
      method: "POST",
      body: "invalid-json",
    });
    const badRes = await handleSettingsRoute(badReq, new URL(badReq.url));
    expect(badRes?.status).toBe(400);
  });
});
