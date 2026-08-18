import { syncGitToDatabase } from "../../shared/lib/parser";
import { cleanupObsoleteItems, getCollectionFromDb } from "../lib/db/index";
import { initProxy } from "../lib/proxy";
import { getRepoPath, gitSyncStatus, runSync } from "../services/git";

export async function handleSyncRoute(
  req: Request,
  url: URL,
): Promise<Response | null> {
  if (url.pathname === "/api/sync/status" && req.method === "GET") {
    if (url.searchParams.get("fetch") === "true") {
      await runSync();
    }
    return new Response(JSON.stringify(gitSyncStatus), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/sync/cleanup" && req.method === "DELETE") {
    cleanupObsoleteItems();
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/sync/pull" && req.method === "POST") {
    try {
      const repo = getRepoPath();
      const proc = Bun.spawn(["git", "pull", "origin", "main"], {
        cwd: repo,
        stdout: "pipe",
        stderr: "pipe",
      });
      await proc.exited;
      if (proc.exitCode !== 0) {
        const errText = await new Response(proc.stderr).text();
        const outText = await new Response(proc.stdout).text();
        const fullError = `${errText}\n${outText}`.trim();
        console.error(`Git pull failed:\n${fullError}`);
        return new Response(
          JSON.stringify({ error: "Git pull failed. Check server logs." }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      await syncGitToDatabase(repo);
      const data = getCollectionFromDb();
      await initProxy(data.requests, data.environments);

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  return null;
}
