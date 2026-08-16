import { resetDatabase } from "../lib/db";
import { mockStates, initProxy } from "../lib/proxy";
import { updateBackgroundTasks, getRepoPath } from "../services/git";
import { parseCollection, clearParserCache } from "../lib/parser";
import { readdirSync, rmSync } from "fs";
import { resolve } from "path";

export async function handleResetRoute(req: Request, url: URL): Promise<Response | null> {
 if (url.pathname === '/api/reset' && req.method === 'POST') {
 try {
 resetDatabase();
 mockStates.clear();
 
 // Empty the collection folder
 const base = resolve(process.cwd(), '../collection');
 try {
 const items = readdirSync(base);
 for (const item of items) {
 if (item !== '.gitkeep') {
 rmSync(resolve(base, item), { recursive: true, force: true });
 }
 }
 } catch {
 // ignore if base doesn't exist
 }
 
 updateBackgroundTasks(); // Re-init repo path and watcher
 
 clearParserCache();
 const data = await parseCollection(getRepoPath());
 await initProxy(data.requests, data.environments);
 
 return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
 } catch (err: unknown) {
 return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
 }
 }
 return null;
}
