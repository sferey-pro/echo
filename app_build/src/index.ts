import { serve } from "bun";
import index from "./index.html";
import { parseCollection } from "./lib/parser";
import { resolve } from "path";

import { initProxy, mockStates, handleProxyRequest } from "./lib/proxy";
import { updateMockState, getSetting, setSetting, getAllSettings } from './lib/db';
import { existsSync } from "node:fs";


const server = serve({
  port: 3000,
  routes: {
    "/echo-logo.jpg": Bun.file("./public/echo-logo.jpg"),
    "/": index,
  },

  async fetch(req) {
    const url = new URL(req.url);

    // Cors preflight for all requests (API and Proxy)
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "*"
        }
      });
    }

    if (url.pathname === '/api/collections') {
      const collectionPath = getSetting('BRUNO_COLLECTION_PATH') || process.env.BRUNO_COLLECTION_PATH || resolve(process.cwd(), '../collection');
      try {
        const data = await parseCollection(collectionPath);
        await initProxy(data.requests, data.environments);
        
        const enrichedRequests = data.requests.map(r => {
          const state = mockStates.get(r.id);
          return {
            ...r,
            isMocked: state?.isMocked || false,
            currentPayload: state?.payload || r.examples?.[0]?.response?.body?.data || '',
            isStarred: state?.isStarred || false,
            selectedExample: state?.selectedExample || null
          };
        });

        return new Response(JSON.stringify({ 
          folders: data.folders,
          requests: enrichedRequests,
          environments: data.environments || []
        }), {
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
          if (body.isStarred !== undefined) state.isStarred = body.isStarred;
          if (body.selectedExample !== undefined) state.selectedExample = body.selectedExample;
          
          // Persist the new state in SQLite
          updateMockState(body.id, state.isMocked, state.payload, state.isStarred, state.selectedExample);
          
          return new Response(JSON.stringify({ success: true }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        return new Response("Not found", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
      } catch (_e) {
        return new Response("Bad Request", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    if (url.pathname === '/api/settings') {
      if (req.method === 'GET') {
        return new Response(JSON.stringify(getAllSettings()), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
      if (req.method === 'POST') {
        try {
          const body = await req.json();
          if (body.key && typeof body.value === 'string') {
            setSetting(body.key, body.value);
            return new Response(JSON.stringify({ success: true }), {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }
        } catch (e: unknown) {
           console.error("Settings parse error", e);
        }
        return new Response("Bad Request", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    if (url.pathname === '/api/collections/clone' && req.method === 'POST') {
      try {
        const body = await req.json();
        const repoUrl = body.repoUrl;
        const force = body.force;
        if (!repoUrl || typeof repoUrl !== 'string') {
          return new Response("Bad Request", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
        }
        
        let repoName = `repo-${Date.now()}`;
        const parts = repoUrl.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
           repoName = lastPart.replace(/\.git$/, '');
        }
        const targetDir = resolve(process.cwd(), '../collection', repoName);
        
        if (existsSync(targetDir) && !force) {
          return new Response(JSON.stringify({ error: "EXISTS" }), { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        }
        
        const rmProc = Bun.spawn(["rm", "-rf", targetDir]);
        await rmProc.exited;

        
        const proc = Bun.spawn(["git", "clone", repoUrl, targetDir]);
        await proc.exited;
        
        if (proc.exitCode !== 0) {
           const errText = await new Response(proc.stderr).text();
           console.error("Git clone failed:", errText);
           return new Response(JSON.stringify({ error: "Git clone failed: " + errText }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        }
        
        setSetting('BRUNO_COLLECTION_PATH', targetDir);
        
        return new Response(JSON.stringify({ success: true, path: targetDir }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err: unknown) {
         const e = err as Error;
         console.error("Clone error", e);
         return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    // Tout ce qui ne correspond ni aux routes (SPA), ni à l'API interne, part vers le proxy MSW !
    return handleProxyRequest(req);
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,
    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Unified Echo Server running at ${server.url} (Dashboard, API & Proxy)`);
