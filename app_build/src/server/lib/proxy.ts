import { http, HttpResponse } from "msw";
import type { ApiRequest } from "../../shared/lib/parser";
import type { MockVariantDef } from "./db";
import type { SetupServer } from "msw/node";

export const mockVariants = new Map<string, MockVariantDef[]>();
export const requestMeta = new Map<string, { isStarred: boolean }>();

let isInitialized = false;
let mswServer: SetupServer | null = null;
let initPromise: Promise<void> | null = null;

import { getMockVariants, getRequestMeta, getSetting } from "./db";

export async function initProxy(
  requests: ApiRequest[],
  environments: {
    name: string;
    variables: { name: string; value: string }[];
  }[] = [],
) {
  const targetApiUrl =
    getSetting("TARGET_API_URL") ||
    process.env.TARGET_API_URL ||
    "http://localhost:8080";
  const activeEnvironmentName = getSetting("ACTIVE_ENVIRONMENT");
  const activeEnv =
    environments.find((e) => e.name === activeEnvironmentName) || null;

  const dbVariants = getMockVariants();
  mockVariants.clear();
  for (const [k, v] of Object.entries(dbVariants)) {
    mockVariants.set(k, v);
  }

  const dbMeta = getRequestMeta();
  requestMeta.clear();
  for (const [k, v] of Object.entries(dbMeta)) {
    requestMeta.set(k, v);
  }

  const handlerDefs: Array<{
    mswPath: string;
    mswMethod: Function;
    handler: Function;
  }> = [];

  for (const req of requests) {
    const variants = mockVariants.get(req.id) || [];

    // S'assurer qu'il y a toujours au moins la variante Default
    if (variants.length === 0) {
      const data = req.examples?.[0]?.response?.body?.data;
      const payloadStr =
        typeof data === "string"
          ? data
          : data !== null && data !== undefined
            ? JSON.stringify(data, null, 2)
            : "{}";

      variants.push({
        id: `${req.id}-default`,
        name: "Default",
        isMocked: false,
        payload: payloadStr,
        selectedExample: null,
        statusCode: 200,
        latencyMs: 0,
        pathParamsOverrides: {},
      });
      mockVariants.set(req.id, variants);
    }

    for (const variant of variants) {
      const method = req.method.toLowerCase() as keyof typeof http;
      let mswPath = req.url;

      // 1. Appliquer les overrides locaux (variables {{var}} et params :id)
      if (variant.pathParamsOverrides) {
        for (const [key, value] of Object.entries(
          variant.pathParamsOverrides,
        )) {
          if (!value) continue;
          const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          mswPath = mswPath.replace(
            new RegExp(`\\{\\{${safeKey}\\}\\}`, "g"),
            value,
          );
          mswPath = mswPath.replace(new RegExp(`:${safeKey}\\b`, "g"), value);
        }
      }

      // 2. Remplacer les variables d'environnement actives
      if (activeEnv) {
        for (const v of activeEnv.variables) {
          const safeName = v.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          mswPath = mswPath.replace(
            new RegExp(`\\{\\{${safeName}\\}\\}`, "g"),
            v.value,
          );
        }
      }
      // Fallback baseUrl si non défini
      mswPath = mswPath.replace(/\{\{baseUrl\}\}/g, targetApiUrl);

      // Éviter les doubles slashes accidentels
      mswPath = mswPath.replace(/([^:])\/\//g, "$1/");

      const mswMethod = http[method] || http.all;

      handlerDefs.push({
        mswPath,
        mswMethod,
        handler: async () => {
          if (variant.isMocked) {
            if (variant.latencyMs && variant.latencyMs > 0) {
              await new Promise((r) => setTimeout(r, variant.latencyMs));
            }

            console.log(
              `[MSW] Intercepted & Mocked: ${mswPath} (Status: ${variant.statusCode}, Latency: ${variant.latencyMs}ms)`,
            );

            const corsHeaders = {
              "Access-Control-Allow-Methods":
                "GET, POST, PUT, DELETE, OPTIONS, PATCH",
              "Access-Control-Allow-Headers": "*",
              "Access-Control-Expose-Headers": "*",
            };

            if (variant.statusCode === 204) {
              return new HttpResponse(null, {
                headers: corsHeaders,
                status: 204,
              });
            }

            try {
              return HttpResponse.json(JSON.parse(variant.payload), {
                headers: corsHeaders,
                status: variant.statusCode,
              });
            } catch {
              return new HttpResponse(variant.payload, {
                headers: corsHeaders,
                status: variant.statusCode,
              });
            }
          }
          return; // Pass-through
        },
      });
    }
  }

  // Trier les handlers : les chemins les plus spécifiques (sans ':') en premier
  handlerDefs.sort((a, b) => {
    const aWildcards = (a.mswPath.match(/:[a-zA-Z0-9_]+/g) || []).length;
    const bWildcards = (b.mswPath.match(/:[a-zA-Z0-9_]+/g) || []).length;
    return aWildcards - bWildcards;
  });

  const handlers = handlerDefs.map((def) =>
    def.mswMethod(def.mswPath, def.handler),
  );

  if (!isInitialized) {
    if (!initPromise) {
      initPromise = (async () => {
        const moduleName = "msw/node";
        const { setupServer } = await import(moduleName);
        mswServer = setupServer(...handlers);
        if (mswServer) {
          mswServer.listen({ onUnhandledRequest: "bypass" });
        }
        isInitialized = true;
      })();
    }
    await initPromise;
  } else {
    // Reset existing MSW server with new handlers (for hot-reload on settings update)
    if (mswServer) {
      mswServer.resetHandlers(...handlers);
    }
  }
}

export async function handleProxyRequest(req: Request): Promise<Response> {
  const targetApiUrl =
    getSetting("TARGET_API_URL") ||
    process.env.TARGET_API_URL ||
    "http://localhost:8080";
  const url = new URL(req.url);
  const realUrl = targetApiUrl + url.pathname + url.search;

  console.log(`[PROXY] ${req.method} ${url.pathname} -> ${realUrl}`);

  try {
    const proxyHeaders = new Headers();

    // Copy only safe headers
    const unsafeHeaders = [
      "host",
      "origin",
      "referer",
      "connection",
      "accept-encoding",
      "content-length",
      "authorization",
      "cookie",
    ];
    req.headers.forEach((value, key) => {
      if (!unsafeHeaders.includes(key.toLowerCase()) && !key.startsWith(":")) {
        proxyHeaders.set(key, value);
      }
    });

    let proxyReq: Request;
    if (req.method === "GET" || req.method === "HEAD") {
      proxyReq = new Request(realUrl, {
        method: req.method,
        headers: proxyHeaders,
      });
    } else {
      proxyReq = new Request(realUrl, {
        method: req.method,
        headers: proxyHeaders,
        body: await req.arrayBuffer(),
      });
    }
    const response = await fetch(proxyReq);

    // Inject CORS headers to real responses so the frontend is never blocked
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    );
    responseHeaders.set("Access-Control-Allow-Headers", "*");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const e = err as Error;
    console.error("[PROXY ERROR]", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
