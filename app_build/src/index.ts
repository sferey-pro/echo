import { serve } from "bun";
import index from "./index.html";
import { parseCollection } from "./lib/parser";
import { resolve } from "path";

import { initProxy, mockStates, handleProxyRequest } from "./lib/proxy";
import { updateMockState, getSetting, setSetting, getAllSettings, getMockStates, getScenarios, createScenario, updateScenario, deleteScenario, applyScenarioActions } from './lib/db';
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
      const activeName = getSetting('ACTIVE_COLLECTION_NAME') || 'samples-bruno';
      const collectionPath = resolve(process.cwd(), '../collection', activeName);
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
            selectedExample: state?.selectedExample || null,
            statusCode: state?.statusCode ?? 200,
            latencyMs: state?.latencyMs ?? 0,
            pathParamsOverrides: state?.pathParamsOverrides ?? {}
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
          if (body.statusCode !== undefined) state.statusCode = body.statusCode;
          if (body.latencyMs !== undefined) state.latencyMs = body.latencyMs;
          if (body.pathParamsOverrides !== undefined) state.pathParamsOverrides = body.pathParamsOverrides;
          
          // Persist the new state in SQLite
          updateMockState(body.id, state.isMocked, state.payload, state.isStarred, state.selectedExample, state.statusCode, state.latencyMs, state.pathParamsOverrides);
          
          // Reset MSW
          const activeName = getSetting('ACTIVE_COLLECTION_NAME') || 'samples-bruno';
          const collectionPath = resolve(process.cwd(), '../collection', activeName);
          const data = await parseCollection(collectionPath);
          await initProxy(data.requests, data.environments);
          
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

    if (url.pathname === '/api/repositories' && req.method === 'GET') {
      try {
        const collDir = resolve(process.cwd(), '../collection');
        if (!existsSync(collDir)) {
           return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        }
        const { readdir } = require('node:fs/promises');
        const entries = await readdir(collDir, { withFileTypes: true });
        const repos = entries.filter((e: any) => e.isDirectory()).map((e: any) => e.name);
        return new Response(JSON.stringify(repos), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      } catch (err: unknown) {
         return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    if (url.pathname === '/api/repositories/clone' && req.method === 'POST') {
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
        
        // We DO NOT set it as active automatically anymore
        return new Response(JSON.stringify({ success: true, name: repoName }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err: unknown) {
         const e = err as Error;
         console.error("Clone error", e);
         return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    const matchDelete = url.pathname.match(/^\/api\/repositories\/(.+)$/);
    if (matchDelete && req.method === 'DELETE') {
       try {
         const repoName = matchDelete[1];
         if (!repoName) return new Response("Bad Request", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
         // Protect against path traversal
         if (repoName.includes('..') || repoName.includes('/')) {
            return new Response("Forbidden", { status: 403, headers: { "Access-Control-Allow-Origin": "*" } });
         }
         const targetDir = resolve(process.cwd(), '../collection', repoName);
         if (existsSync(targetDir)) {
            const rmProc = Bun.spawn(["rm", "-rf", targetDir]);
            await rmProc.exited;
         }
         return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
       } catch (err: unknown) {
         return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
       }
    }

    if (url.pathname === '/api/scenarios' && req.method === 'GET') {
      try {
        const scenarios = getScenarios();
        return new Response(JSON.stringify(scenarios), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err: unknown) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    if (url.pathname === '/api/scenarios' && req.method === 'POST') {
      try {
        const body = await req.json();
        if (!body.name) return new Response("Bad Request: missing name", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
        
        let actionsToSave = body.actions;
        // Si aucune action n'est fournie, on sauvegarde l'état actuel
        if (!actionsToSave) {
          const currentStates = getMockStates();
          actionsToSave = Object.entries(currentStates)
            .filter(([_, state]) => state.isMocked)
            .map(([reqId, state]) => ({
              requestId: reqId,
              payload: state.payload,
              statusCode: state.statusCode,
              latencyMs: state.latencyMs,
              selectedExample: state.selectedExample,
              pathParamsOverrides: state.pathParamsOverrides
            }));
        }
        
        const id = `scenario-${Date.now()}`;
        createScenario(id, body.name, actionsToSave);
        
        return new Response(JSON.stringify({ success: true, id }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err: unknown) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    if (url.pathname === '/api/scenarios/apply' && req.method === 'POST') {
      try {
        const body = await req.json();
        if (!body.id) return new Response("Bad Request: missing id", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
        
        const scenarios = getScenarios();
        const scenario = scenarios.find(s => s.id === body.id);
        if (!scenario) return new Response("Scenario not found", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
        
        applyScenarioActions(scenario.actions as any[]);
        
        // Reset MSW
        const activeName = getSetting('ACTIVE_COLLECTION_NAME') || 'samples-bruno';
        const collectionPath = resolve(process.cwd(), '../collection', activeName);
        const data = await parseCollection(collectionPath);
        await initProxy(data.requests, data.environments);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err: unknown) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    const matchDeleteScenario = url.pathname.match(/^\/api\/scenarios\/(.+)$/);
    if (matchDeleteScenario && req.method === 'DELETE') {
      try {
        const id = matchDeleteScenario[1];
        if (!id) return new Response("Bad Request", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
        deleteScenario(id);
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      } catch (err: unknown) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }
    
    const matchUpdateScenario = url.pathname.match(/^\/api\/scenarios\/(.+)$/);
    if (matchUpdateScenario && req.method === 'PUT') {
      try {
        const id = matchUpdateScenario[1];
        if (!id) return new Response("Bad Request", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
        const body = await req.json();
        if (!body.name || !body.actions) return new Response("Bad Request: missing name or actions", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
        
        updateScenario(id, body.name, body.actions);
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      } catch (err: unknown) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
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
