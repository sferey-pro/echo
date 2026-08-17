import { describe, it, expect, beforeEach } from "bun:test";
import { handleMocksRoute } from "./mocks";
import { resetDatabase, getRequestMeta, getMockVariants } from "../lib/db/index";

describe("API Route: /api/mocks/*", () => {
  beforeEach(() => {
    resetDatabase();
  });

  it("should update request meta", async () => {
    const req = new Request("http://localhost:3000/api/mocks/meta", {
      method: "POST",
      body: JSON.stringify({ id: "req1", isStarred: true }),
    });
    const url = new URL(req.url);
    const res = await handleMocksRoute(req, url);
    expect(res?.status).toBe(200);

    const meta = getRequestMeta();
    expect(meta["req1"]).toBeDefined();
    expect(meta["req1"]?.isStarred).toBe(true);
  });

  it("should create a new variant", async () => {
    const req = new Request("http://localhost:3000/api/mocks/variants", {
      method: "POST",
      body: JSON.stringify({ requestId: "req2", name: "My Test Variant" }),
    });
    const url = new URL(req.url);
    const res = await handleMocksRoute(req, url);
    expect(res?.status).toBe(200);

    const variants = getMockVariants();
    expect(variants["req2"]?.length).toBe(1);
    expect(variants["req2"]?.[0]?.name).toBe("My Test Variant");
  });

  it("should reject invalid variant creation body", async () => {
    const req = new Request("http://localhost:3000/api/mocks/variants", {
      method: "POST",
      body: JSON.stringify({ invalidField: "missing name and req id" }),
    });
    const url = new URL(req.url);
    const res = await handleMocksRoute(req, url);
    expect(res?.status).toBe(400);
  });

  it("should update a variant", async () => {
    const createReq = new Request("http://localhost/api/mocks/variants", {
      method: "POST",
      body: JSON.stringify({ requestId: "req1", name: "To Update" }),
    });
    const createRes = await handleMocksRoute(createReq, new URL(createReq.url));
    const { id } = (await createRes!.json()) as { id: string };

    const updateReq = new Request(`http://localhost/api/mocks/variants/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: "Updated Name",
        isMocked: true,
        statusCode: 204,
      }),
    });
    const updateRes = await handleMocksRoute(updateReq, new URL(updateReq.url));
    expect(updateRes?.status).toBe(200);

    const variantsMap = getMockVariants();
    const variants = variantsMap["req1"] || [];
    const updated = variants.find((v) => v.id === id);
    expect(updated?.name).toBe("Updated Name");
    expect(updated?.statusCode).toBe(204);
  });

  it("should delete a variant", async () => {
    const createReq = new Request("http://localhost/api/mocks/variants", {
      method: "POST",
      body: JSON.stringify({ requestId: "req2", name: "To Delete" }),
    });
    const createRes = await handleMocksRoute(createReq, new URL(createReq.url));
    const { id } = (await createRes!.json()) as { id: string };

    const delReq = new Request(`http://localhost/api/mocks/variants/${id}`, {
      method: "DELETE",
    });
    const delRes = await handleMocksRoute(delReq, new URL(delReq.url));
    expect(delRes?.status).toBe(200);

    const variantsMap = getMockVariants();
    const variants = variantsMap["req2"] || [];
    const deleted = variants.find((v) => v.id === id);
    expect(deleted).toBeUndefined();
  });

  it("should not delete default variant", async () => {
    const delReq = new Request(
      `http://localhost/api/mocks/variants/req-default`,
      {
        method: "DELETE",
      },
    );
    const delRes = await handleMocksRoute(delReq, new URL(delReq.url));
    expect(delRes?.status).toBe(403);
  });
});
