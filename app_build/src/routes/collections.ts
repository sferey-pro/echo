import { getCollectionFromDb } from "../lib/db";
import { syncGitToDatabase } from "../lib/parser";
import { initProxy, mockVariants, requestMeta } from "../lib/proxy";
import { getRepoPath } from "../services/git";

export async function handleCollectionsRoute(req: Request, url: URL): Promise<Response | null> {
 if (url.pathname === '/api/collections') {
 try {
 await syncGitToDatabase(getRepoPath());
 const data = getCollectionFromDb();
 await initProxy(data.requests, data.environments);
 
 const enrichedRequests = data.requests.map(r => {
 const states = mockVariants.get(r.id) || [];
 const meta = requestMeta.get(r.id);
 
 return {
 ...r,
 variants: states,
 isStarred: meta?.isStarred || false
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
 return null;
}
