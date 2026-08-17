import { describe, it, expect, beforeEach, mock } from "bun:test";
import { handleScenariosRoute } from "./scenarios";
import { resetDatabase } from "../lib/db";

describe("API Route: /api/scenarios", () => {
  beforeEach(() => {
    resetDatabase();
  });

  it("should list scenarios", async () => {
    const req = new Request("http://localhost/api/scenarios", {
      method: "GET",
    });
    const res = await handleScenariosRoute(req, new URL(req.url));
    expect(res?.status).toBe(200);
    const scenarios = await res?.json();
    expect(scenarios).toEqual([]);
  });

  it("should create a scenario", async () => {
    const req = new Request("http://localhost/api/scenarios", {
      method: "POST",
      body: JSON.stringify({ name: "My Scenario", actions: [] }),
    });
    const res = await handleScenariosRoute(req, new URL(req.url));
    expect(res?.status).toBe(200);
    const data = (await res?.json()) as any;
    expect(data.success).toBe(true);
    expect(data.id).toContain("scenario-");
  });

  it("should create a scenario automatically collecting current mock states if no actions provided", async () => {
    // Setup a mock state in proxy
    const { mockVariants } = require("../lib/proxy");
    mockVariants.set("req1", [
      {
        id: "var1",
        isMocked: true,
        payload: "ok",
        statusCode: 200,
        latencyMs: 0,
        selectedExample: null,
        pathParamsOverrides: null,
      },
    ]);

    const req = new Request("http://localhost/api/scenarios", {
      method: "POST",
      body: JSON.stringify({ name: "Auto Scenario" }), // no actions array
    });
    const res = await handleScenariosRoute(req, new URL(req.url));
    const data = (await res?.json()) as any;
    expect(data.success).toBe(true);

    const { getScenarios } = require("../lib/db");
    const scenarios = getScenarios();
    const created = scenarios.find((s: any) => s.id === data.id);
    expect(created.actions.length).toBe(1);
    expect(created.actions[0].requestId).toBe("req1");
    expect(created.actions[0].variantId).toBe("var1");
  });

  it("should update a scenario", async () => {
    const createReq = new Request("http://localhost/api/scenarios", {
      method: "POST",
      body: JSON.stringify({ name: "To Update", actions: [] }),
    });
    const createRes = await handleScenariosRoute(
      createReq,
      new URL(createReq.url),
    );
    const { id } = (await createRes!.json()) as any;

    const updateReq = new Request(`http://localhost/api/scenarios/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Updated", actions: [] }),
    });
    const updateRes = await handleScenariosRoute(
      updateReq,
      new URL(updateReq.url),
    );
    expect(updateRes?.status).toBe(200);
  });

  it("should delete a scenario", async () => {
    const createReq = new Request("http://localhost/api/scenarios", {
      method: "POST",
      body: JSON.stringify({ name: "To Delete", actions: [] }),
    });
    const createRes = await handleScenariosRoute(
      createReq,
      new URL(createReq.url),
    );
    const { id } = (await createRes!.json()) as any;

    const delReq = new Request(`http://localhost/api/scenarios/${id}`, {
      method: "DELETE",
    });
    const delRes = await handleScenariosRoute(delReq, new URL(delReq.url));
    expect(delRes?.status).toBe(200);
  });

  it("should apply a scenario", async () => {
    const createReq = new Request("http://localhost/api/scenarios", {
      method: "POST",
      body: JSON.stringify({ name: "To Apply", actions: [] }),
    });
    const createRes = await handleScenariosRoute(
      createReq,
      new URL(createReq.url),
    );
    const { id } = (await createRes!.json()) as any;

    const applyReq = new Request(`http://localhost/api/scenarios/apply`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    const applyRes = await handleScenariosRoute(
      applyReq,
      new URL(applyReq.url),
    );
    expect(applyRes?.status).toBe(200);
  });
});
