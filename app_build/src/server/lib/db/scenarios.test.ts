import { describe, it, expect, beforeEach } from "bun:test";
import { createScenario, getScenarios, updateScenario, deleteScenario } from "./scenarios";
import { resetDatabase } from "./settings";

describe("Database - Scenarios", () => {
  beforeEach(() => {
    resetDatabase();
  });

  it("should create and get scenarios", () => {
    createScenario("sc1", "My Scenario", [
      {
        type: "MOCK_VARIANT",
        requestId: "req-1",
        variantId: "v1",
        delayMs: 100,
        overridePayload: "hello",
      },
    ]);

    const scenarios = getScenarios();
    expect(scenarios.length).toBe(1);
    expect(scenarios[0]?.id).toBe("sc1");
    expect(scenarios[0]?.name).toBe("My Scenario");
    expect(scenarios[0]?.actions.length).toBe(1);
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
