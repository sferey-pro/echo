import { getAllSettings, setSetting } from "../lib/db";
import { updateBackgroundTasks } from "../services/git";

export async function handleSettingsRoute(req: Request, url: URL): Promise<Response | null> {
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
 
 if (body.key === 'REPO_PATH' || body.key === 'ACTIVE_COLLECTION_NAME') {
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
 return null;
}
