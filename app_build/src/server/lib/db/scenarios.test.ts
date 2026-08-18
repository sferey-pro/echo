import { beforeEach, describe, expect, it } from "bun:test";
import {
  createScenario,
  deleteScenario,
  getScenarios,
  updateScenario,
} from "./scenarios";
import { resetDatabase } from "./settings";

describe("Database - Scenarios", () => {
  beforeEach(() => {
    resetDatabase();
  });

  it("should create and get scenarios", () => {
    createScenario("sc1", "My Scenario", [
      {
        requestId: "req-1",
        isMocked: true,
        statusCode: 200,
        latencyMs: 100,
        payload: "hello",
        selectedExample: null,
        pathParamsOverrides: {},
      },
    ]);

    const scenarios = getScenarios();
    expect(scenarios.length).toBe(1);
    expect(scenarios[0]?.id).toBe("sc1");
    expect(scenarios[0]?.name).toBe("My Scenario");
    expect(scenarios[0]?.actions.length).toBe(1);
    // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
    expect((scenarios[0]?.actions[0] as any)?.requestId).toBe("req-1");
  });

  it("should update and delete a scenario", () => {
    createScenario("sc2", "Old", []);
    updateScenario("sc2", "Updated", []);

    let scenarios = getScenarios();
    expect(scenarios[0]?.name).toBe("Updated");
    expect(scenarios[0]?.actions.length).toBe(0);

    deleteScenario("sc2");
    scenarios = getScenarios();
    expect(scenarios.length).toBe(0);
  });
});
