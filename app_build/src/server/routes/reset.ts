import { readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { syncGitToDatabase } from "../../shared/lib/parser";
import { getCollectionFromDb, resetDatabase } from "../lib/db/index";
import { initProxy, mockVariants } from "../lib/proxy";
import { getRepoPath, updateBackgroundTasks } from "../services/git";

export async function handleResetRoute(
  req: Request,
  url: URL,
): Promise<Response | null> {
  if (url.pathname === "/api/reset" && req.method === "POST") {
    try {
      resetDatabase();
      mockVariants.clear();

      // Empty the collection folder
      const base = resolve(process.cwd(), "collection");
      try {
        const items = readdirSync(base);
        for (const item of items) {
          if (item !== ".gitkeep") {
            rmSync(resolve(base, item), { recursive: true, force: true });
          }
        }
      } catch {
        // ignore if base doesn't exist
      }

      updateBackgroundTasks(true); // Re-init repo path and watcher

      await syncGitToDatabase(getRepoPath());
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
