import { describe, it, expect, beforeEach } from "bun:test";
import { getSetting, setSetting, getAllSettings } from "./settings";
import { resetDatabase } from "./settings";

describe("Database - Settings", () => {
  beforeEach(() => {
    resetDatabase();
  });

  it("should set and get a setting", () => {
    setSetting("TEST_KEY", "test_value");
    const val = getSetting("TEST_KEY");
    expect(val).toBe("test_value");
  });

  it("should return all settings", () => {
    setSetting("KEY1", "VAL1");
    setSetting("KEY2", "VAL2");
    const all = getAllSettings();
    expect(all["KEY1"]).toBe("VAL1");
    expect(all["KEY2"]).toBe("VAL2");
  });
});
