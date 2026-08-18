import { randomUUID } from "node:crypto";
import {
  createMockVariant,
  deleteMockVariant,
  updateMockVariant,
  updateRequestMeta,
} from "../lib/db/index";
import { mockVariants } from "../lib/proxy";

export async function handleMocksRoute(
  req: Request,
  url: URL,
): Promise<Response | null> {
  // Mettre à jour les métadonnées de la requête (ex: favoris)
  if (url.pathname === "/api/mocks/meta" && req.method === "POST") {
    try {
      const body = await req.json();
      if (!body || typeof body.id !== "string") {
        return new Response("Invalid body", { status: 400 });
      }
      updateRequestMeta(body.id, !!body.isStarred);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      return new Response(String(err), { status: 400, headers: {} });
    }
  }

  // Créer une nouvelle variante
  if (url.pathname === "/api/mocks/variants" && req.method === "POST") {
    try {
      const body = await req.json();
      if (
        !body ||
        typeof body.requestId !== "string" ||
        typeof body.name !== "string"
      ) {
        return new Response("Invalid body", { status: 400 });
      }
      const variantId = randomUUID();
      createMockVariant(
        variantId,
        body.requestId,
        body.name,
        false,
        "{}",
        null,
        200,
        0,
        null,
      );

      // Update memory cache
      if (!mockVariants.has(body.requestId))
        mockVariants.set(body.requestId, []);
      mockVariants.get(body.requestId)?.push({
        id: variantId,
        name: body.name,
        isMocked: false,
        payload: "{}",
        selectedExample: null,
        statusCode: 200,
        latencyMs: 0,
        pathParamsOverrides: {},
      });

      return new Response(JSON.stringify({ success: true, id: variantId }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      return new Response(String(err), { status: 400, headers: {} });
    }
  }

  // Mettre à jour une variante existante
  if (url.pathname.startsWith("/api/mocks/variants/") && req.method === "PUT") {
    try {
      // biome-ignore lint/style/noNonNullAssertion: DOM element is guaranteed to exist
      const id = url.pathname.split("/").pop()!;
      const body = await req.json();
      updateMockVariant(id, body);

      // Find in memory cache and update
      for (const variants of mockVariants.values()) {
        const variant = variants.find((v) => v.id === id);
        if (variant) {
          if (body.name !== undefined) variant.name = body.name;
          if (body.isMocked !== undefined) variant.isMocked = body.isMocked;
          if (body.payload !== undefined) variant.payload = body.payload;
          if (body.selectedExample !== undefined)
            variant.selectedExample = body.selectedExample;
          if (body.statusCode !== undefined)
            variant.statusCode = body.statusCode;
          if (body.latencyMs !== undefined) variant.latencyMs = body.latencyMs;
          if (body.pathParamsOverrides !== undefined)
            variant.pathParamsOverrides = body.pathParamsOverrides;
          break;
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      return new Response(String(err), { status: 400, headers: {} });
    }
  }

  // Supprimer une variante
  if (
    url.pathname.startsWith("/api/mocks/variants/") &&
    req.method === "DELETE"
  ) {
    try {
      // biome-ignore lint/style/noNonNullAssertion: DOM element is guaranteed to exist
      const id = url.pathname.split("/").pop()!;

      if (id.endsWith("-default")) {
        return new Response("Cannot delete default variant", { status: 403 });
      }

      deleteMockVariant(id);

      // Find in memory cache and delete
      for (const [_reqId, variants] of mockVariants.entries()) {
        const index = variants.findIndex((v) => v.id === id);
        if (index !== -1) {
          variants.splice(index, 1);
          break;
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      return new Response(String(err), { status: 400, headers: {} });
    }
  }

  return null;
}
