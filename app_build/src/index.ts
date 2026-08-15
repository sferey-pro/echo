import { serve } from "bun";
import index from "./index.html";
import { parseCollection } from "./lib/parser";
import { resolve } from "path";

import { initProxy, mockStates, handleProxyRequest } from "./lib/proxy";
import { updateMockState, getSetting, setSetting, getAllSettings, getMockStates, getScenarios, createScenario, updateScenario, deleteScenario, applyScenarioActions } from './lib/db';
import { existsSync, watch } from "node:fs";
import { readdir } from "node:fs/promises";
import type { Dirent } from "node:fs";
import type { ScenarioAction } from "./lib/api";
import { parseFile, removeFileFromCache } from "./lib/parser";

const defaultRepoPath = resolve(process.cwd(), '../collection');
const REPO_PATH = process.env.REPO_PATH || defaultRepoPath;


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
      try {
        const data = await parseCollection(REPO_PATH);
        await initProxy(data.requests, data.environments);
        
        const enrichedRequests = data.requests.map(r => {
          const state = mockStates.get(r.id);
          return {
            ...r,
            isMocked: state?.isMocked || false,
            currentPayload: state?.payload || (typeof r.examples?.[0]?.response?.body?.data === 'string' ? r.examples[0].response.body.data : (r.examples?.[0]?.response?.body?.data ? JSON.stringify(r.examples[0].response.body.data, null, 2) : '')),
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
          
          // Mettre à jour l'état local dans mockStates sans redémarrer MSW
          // Car mswProxy lit dynamiquement mockStates
          
          return new Response(JSON.stringify({ success: true }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        return new Response("Not found", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
      } catch (err: unknown) {
        const e = err as Error;
        console.error("Erreur dans /api/mocks/update :", e);
        return new Response(e.message || "Bad Request", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
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
            
            if (body.key === 'REPO_PATH') {
              updateBackgroundTasks();
            }
            
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

    if (url.pathname === '/api/sync/status' && req.method === 'GET') {
      return new Response(JSON.stringify(gitSyncStatus), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (url.pathname === '/api/sync/pull' && req.method === 'POST') {
      try {
        const repo = getRepoPath();
        const proc = Bun.spawn(["git", "pull"], { cwd: repo, stdout: "pipe", stderr: "pipe" });
        await proc.exited;
        if (proc.exitCode !== 0) {
           const errText = await new Response(proc.stderr).text();
           const outText = await new Response(proc.stdout).text();
           const fullError = (errText + "\n" + outText).trim();
           return new Response(JSON.stringify({ error: "Git pull failed:\n" + fullError }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        }
        
        gitSyncStatus.commitsBehind = 0;
        gitSyncStatus.isSynced = true;
        gitSyncStatus.error = "";
        
        const data = await parseCollection(repo, true);
        await initProxy(data.requests, data.environments, true);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err: unknown) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    if (url.pathname === '/api/repositories' && req.method === 'GET') {
      try {
        const collDir = resolve(process.cwd(), '../collection');
        if (!existsSync(collDir)) {
           return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        }
        const entries = await readdir(collDir, { withFileTypes: true });
        const repos = entries.filter((e: Dirent) => e.isDirectory()).map((e: Dirent) => e.name);
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
        
        const rmProc = Bun.spawn(["rm", "-rf", targetDir], { stdout: "pipe", stderr: "pipe" });
        await rmProc.exited;
        
        const proc = Bun.spawn(["git", "clone", repoUrl, targetDir], { stdout: "pipe", stderr: "pipe" });
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
            .filter(([, state]) => state.isMocked)
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
        
        applyScenarioActions(scenario.actions as ScenarioAction[]);
        
        // Refresh all states in MSW proxy logic is handled dynamically, but we re-init if new routes were affected
        // Actually, since applyScenarioActions only updates DB, we must update the memory map
        const data = await parseCollection(REPO_PATH);
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
console.log(`📂 Using Repo Path: ${REPO_PATH}`);

function getRepoPath() {
  return getSetting('REPO_PATH') || process.env.REPO_PATH || resolve(process.cwd(), '../collection');
}

// --- BACKGROUND SYNC ---
let currentWatcher: any = null;
let currentWatchPath: string | null = null;
let syncTimer: any = null;

export const gitSyncStatus = { isSynced: true, commitsBehind: 0, error: "" };

async function runSync() {
  const repo = getRepoPath();
  if (existsSync(repo) && existsSync(resolve(repo, '.git'))) {
    try {
      // Execute fetch
      const fetchProc = Bun.spawn(["git", "fetch"], { cwd: repo, stdout: "pipe", stderr: "pipe" });
      await fetchProc.exited;
      if (fetchProc.exitCode === 0) {
        // Check delta
        const revProc = Bun.spawn(["git", "rev-list", "HEAD..@{u}", "--count"], { cwd: repo, stdout: "pipe", stderr: "pipe" });
        await revProc.exited;
        if (revProc.exitCode === 0) {
           const countStr = await new Response(revProc.stdout).text();
           const count = parseInt(countStr.trim(), 10);
           if (!isNaN(count)) {
             gitSyncStatus.commitsBehind = count;
             gitSyncStatus.isSynced = count === 0;
             gitSyncStatus.error = "";
           }
        } else {
           // Si pas d'upstream configuré, on le log mais on ne crash pas
           gitSyncStatus.error = "Pas d'upstream configuré pour la branche courante.";
        }
      } else {
         const errText = await new Response(fetchProc.stderr).text();
         gitSyncStatus.error = errText;
      }
    } catch (e) {
      console.error("[Git Polling] Failed to fetch", e);
      gitSyncStatus.error = (e as Error).message;
    }
  }
  
  const interval = parseInt(getSetting('GIT_SYNC_INTERVAL') || process.env.GIT_SYNC_INTERVAL || "300000", 10);
  syncTimer = setTimeout(runSync, interval);
}

export function updateBackgroundTasks() {
  const repo = getRepoPath();
  if (repo !== currentWatchPath) {
    if (currentWatcher) {
      currentWatcher.close();
      currentWatcher = null;
    }
    currentWatchPath = repo;
    
    if (existsSync(repo)) {
      console.log(`📂 Using Repo Path: ${repo}`);
      currentWatcher = watch(repo, { recursive: true }, async (event, filename) => {
        if (!filename || filename.startsWith('.git') || filename.startsWith('node_modules')) return;
        if (filename.endsWith('.yml') || filename.endsWith('.bru') || filename.endsWith('.json')) {
          const fullPath = resolve(repo, filename);
          if (existsSync(fullPath)) {
            await parseFile(repo, fullPath);
          } else {
            removeFileFromCache(repo, fullPath);
          }
          const data = await parseCollection(repo);
          await initProxy(data.requests, data.environments, true);
        }
      });
    }
  }
}

// Initial start
updateBackgroundTasks();
runSync();

