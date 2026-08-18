import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fetchWithConfig, loadCollection } from "./api";

describe("Frontend API", () => {
  beforeEach(() => {
    global.fetch = mock(
      () => Promise.resolve(new Response(JSON.stringify({}), { status: 200 })),
      // biome-ignore lint/suspicious/noExplicitAny: FIXME - needs proper typing
    ) as any;
  });

  it("fetchWithConfig should prepend BASE_API_URL", async () => {
    await fetchWithConfig("/test");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/test",
      expect.anything(),
    );
  });

  it("loadCollection should fetch from /api/collection", async () => {
    await loadCollection();
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/collection",
      expect.anything(),
    );
  });
});
