import { existsSync, watch } from "node:fs";
import { resolve } from "node:path";
import {
  clearParserCache,
  parseFile,
  removeFileFromCache,
  syncGitToDatabase,
} from "../../shared/lib/parser";
import { getSafeRepoPath } from "../../shared/lib/paths";
import {
  clearBrunoTables,
  getCollectionFromDb,
  getSetting,
} from "../lib/db/index";
import { initProxy } from "../lib/proxy";

export const gitSyncStatus = {
  isSynced: true,
  commitsBehind: 0,
  error: "",
  hasGit: false,
};

export function getRepoPath() {
  const activeCol = getSetting("ACTIVE_COLLECTION_NAME");
  if (activeCol) {
    return getSafeRepoPath(activeCol);
  }
  if (process.env.REPO_PATH) {
    return getSafeRepoPath(process.env.REPO_PATH);
  }

  return getSafeRepoPath(".empty");
}

let currentWatcher: { close: () => void } | null = null;
let currentWatchPath: string | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

export async function runSync() {
  const repo = getRepoPath();
  const hasGit = existsSync(repo) && existsSync(resolve(repo, ".git"));
  gitSyncStatus.hasGit = hasGit;

  if (hasGit) {
    try {
      // Execute fetch
      const fetchProc = Bun.spawn(["git", "fetch", "origin", "main"], {
        cwd: repo,
        stdout: "pipe",
        stderr: "pipe",
      });
      await fetchProc.exited;
      if (fetchProc.exitCode === 0) {
        // Check delta
        const revProc = Bun.spawn(
          ["git", "rev-list", "HEAD..origin/main", "--count"],
          { cwd: repo, stdout: "pipe", stderr: "pipe" },
        );
        await revProc.exited;
        if (revProc.exitCode === 0) {
          const countStr = await new Response(revProc.stdout).text();
          const count = parseInt(countStr.trim(), 10);
          if (!Number.isNaN(count)) {
            gitSyncStatus.commitsBehind = count;
            gitSyncStatus.isSynced = count === 0;
            gitSyncStatus.error = "";
          }
        } else {
          gitSyncStatus.error =
            "Pas d'upstream configuré pour la branche courante.";
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
  } else {
    gitSyncStatus.isSynced = false;
    gitSyncStatus.commitsBehind = 0;
    gitSyncStatus.error = "Aucun dépôt Git trouvé.";
  }

  const interval = parseInt(
    getSetting("GIT_SYNC_INTERVAL") ||
      process.env.GIT_SYNC_INTERVAL ||
      "300000",
    10,
  );
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(runSync, interval);
}

let watchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function updateBackgroundTasks(force = false) {
  const repo = getRepoPath();
  if (force || repo !== currentWatchPath) {
    if (currentWatcher) {
      currentWatcher.close();
      currentWatcher = null;
    }
    currentWatchPath = repo;
    clearParserCache();
    clearBrunoTables();

    if (existsSync(repo)) {
      console.log(`📂 Using Repo Path: ${repo}`);
      currentWatcher = watch(
        repo,
        { recursive: true },
        async (_event, filename) => {
          if (
            !filename ||
            filename.startsWith(".git") ||
            filename.startsWith("node_modules")
          )
            return;
          if (
            filename.endsWith(".yml") ||
            filename.endsWith(".bru") ||
            filename.endsWith(".json")
          ) {
            const fullPath = resolve(repo, filename);
            if (existsSync(fullPath)) {
              await parseFile(repo, fullPath);
            } else {
              removeFileFromCache(repo, fullPath);
            }

            if (watchDebounceTimer) clearTimeout(watchDebounceTimer);
            watchDebounceTimer = setTimeout(async () => {
              await syncGitToDatabase(repo);
              const data = getCollectionFromDb();
              await initProxy(data.requests, data.environments);
            }, 1000);
          }
        },
      );
    }
  }
}
