import { existsSync, watch } from "node:fs";
import { resolve } from "path";
import { getSetting } from "../lib/db";
import { parseCollection, parseFile, removeFileFromCache } from "../lib/parser";
import { initProxy } from "../lib/proxy";

export const gitSyncStatus = { isSynced: true, commitsBehind: 0, error: "" };

export function getRepoPath() {
  const activeCol = getSetting('ACTIVE_COLLECTION_NAME');
  const base = resolve(process.cwd(), '../collection');
  if (activeCol) {
    return resolve(base, activeCol);
  }
  return getSetting('REPO_PATH') || process.env.REPO_PATH || base;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentWatcher: any = null;
let currentWatchPath: string | null = null;

export async function runSync() {
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
           gitSyncStatus.error = "Pas d'upstream configuré pour la branche courante.";
        }
      } else {
         const errText = await new Response(fetchProc.stderr).text();
         gitSyncStatus.error = errText;
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.error("[Git Polling] Failed to fetch", e);
      gitSyncStatus.error = e.message;
    }
  }
  
  const interval = parseInt(getSetting('GIT_SYNC_INTERVAL') || process.env.GIT_SYNC_INTERVAL || "300000", 10);
  setTimeout(runSync, interval);
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
          await initProxy(data.requests, data.environments);
        }
      });
    }
  }
}
