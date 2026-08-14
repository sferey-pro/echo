import { serve } from "bun";
import index from "./index.html";
import { parseCollection } from "./lib/parser";
import { resolve } from "path";

import { initProxy, mockStates, handleProxyRequest } from "./lib/proxy";

const targetApiUrl = process.env.TARGET_API_URL || "https://petstore.swagger.io/v2";

const server = serve({
  port: 3000,
  routes: {
    "/echo-logo.jpg": Bun.file("./public/echo-logo.jpg"),
    "/": index,
  },

  async fetch(req) {
    const url = new URL(req.url);

    // Cors preflight for API requests
    if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (url.pathname === '/api/collections') {
      const collectionPath = process.env.BRUNO_COLLECTION_PATH || resolve(process.cwd(), '../examples/Swagger Petstore');
      try {
        const data = await parseCollection(collectionPath);
        await initProxy(data.requests);
        
        // Enrichir avec l'état en mémoire
        const enrichedRequests = data.requests.map(r => {
          const state = mockStates.get(r.id);
          return {
            ...r,
            isMocked: state?.isMocked || false,
            currentPayload: state?.payload || r.examples?.[0]?.response?.body?.data || ''
          };
        });

        return new Response(JSON.stringify({ ...data, requests: enrichedRequests }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        console.error("Error parsing collection:", error);
        return new Response(JSON.stringify({ error: "Failed to parse collection" }), { 
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    if (url.pathname === '/api/mocks/update' && req.method === 'POST') {
      try {
        const body = await req.json();
        const state = mockStates.get(body.id);
        if (state) {
          if (body.isMocked !== undefined) state.isMocked = body.isMocked;
          if (body.payload !== undefined) state.payload = body.payload;
          return new Response(JSON.stringify({ success: true }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        return new Response("Not found", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
      } catch (e) {
        return new Response("Bad Request", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    // Tout ce qui ne correspond ni aux routes (SPA), ni à l'API interne, part vers le proxy MSW !
    return handleProxyRequest(req, targetApiUrl);
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,
    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Unified Echo Server running at ${server.url} (Dashboard, API & Proxy)`);
