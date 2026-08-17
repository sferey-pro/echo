import { describe, it, expect, beforeEach } from "bun:test";
import { createMockVariant, getMockVariants, deleteMockVariant, updateMockVariant } from "./variants";
import { resetDatabase } from "./settings";

describe("Database - Mock Variants", () => {
  beforeEach(() => {
    resetDatabase();
  });

  it("should create and retrieve a mock variant", () => {
    createMockVariant(
      "v1",
      "req1",
      "My Variant",
      true,
      '{"ok":true}',
      "custom",
      200,
      150,
      null,
    );

    const variants = getMockVariants();
    expect(variants["req1"]).toBeDefined();
    expect(variants["req1"]?.length).toBe(1);

    const v = variants["req1"]?.[0];
    expect(v?.id).toBe("v1");
    expect(v?.name).toBe("My Variant");
    expect(v?.isMocked).toBe(true);
    expect(v?.payload).toBe('{"ok":true}');
    expect(v?.latencyMs).toBe(150);
  });

  it("should update a mock variant", () => {
    createMockVariant(
      "v2",
      "req2",
      "Old Name",
      false,
      "",
      null,
      500,
      0,
      null,
    );
    updateMockVariant("v2", {
      name: "New Name",
      isMocked: true,
      statusCode: 201,
    });

    const variants = getMockVariants();
    const v = variants["req2"]?.[0];
    expect(v?.name).toBe("New Name");
    expect(v?.isMocked).toBe(true);
    expect(v?.statusCode).toBe(201);
  });

  it("should delete a mock variant", () => {
    createMockVariant(
      "v3",
      "req3",
      "To Delete",
      false,
      "",
      null,
      200,
      0,
      null,
    );
    deleteMockVariant("v3");

    const variants = getMockVariants();
    expect(variants["req3"]).toBeUndefined();
  });
});
