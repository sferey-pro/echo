import { resetDatabase } from "../lib/db";
import { mockStates, initProxy } from "../lib/proxy";
import { updateBackgroundTasks, getRepoPath } from "../services/git";
import { parseCollection } from "../lib/parser";

export async function handleResetRoute(req: Request, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/reset' && req.method === 'POST') {
    try {
      resetDatabase();
      mockStates.clear();
      updateBackgroundTasks(); // Re-init repo path and watcher
      
      const data = await parseCollection(getRepoPath());
      await initProxy(data.requests, data.environments);
      
      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    } catch (err: unknown) {
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
  }
  return null;
}
