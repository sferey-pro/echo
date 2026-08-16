import { mockStates } from "../lib/proxy";
import { updateMockState } from "../lib/db";

export async function handleMocksRoute(req: Request, url: URL): Promise<Response | null> {
 if (url.pathname === '/api/mocks/update' && req.method === 'POST') {
 try {
 const body = await req.json();
 let state = mockStates.get(body.id);
 
 if (!state) {
 state = {
 isMocked: false,
 payload: '',
 isStarred: false,
 selectedExample: null,
 statusCode: 200,
 latencyMs: 0,
 pathParamsOverrides: {}
 };
 mockStates.set(body.id, state);
 }
 
 if (body.isMocked !== undefined) state.isMocked = body.isMocked;
 if (body.payload !== undefined) state.payload = body.payload;
 if (body.isStarred !== undefined) state.isStarred = body.isStarred;
 if (body.selectedExample !== undefined) state.selectedExample = body.selectedExample;
 if (body.statusCode !== undefined) state.statusCode = body.statusCode;
 if (body.latencyMs !== undefined) state.latencyMs = body.latencyMs;
 if (body.pathParamsOverrides !== undefined) state.pathParamsOverrides = body.pathParamsOverrides;
 
 // Persist the new state in SQLite
 updateMockState(body.id, state.isMocked, state.payload, state.isStarred, state.selectedExample, state.statusCode, state.latencyMs, state.pathParamsOverrides);
 
 return new Response(JSON.stringify({ success: true }), {
 headers: {
 "Content-Type": "application/json",
 "Access-Control-Allow-Origin": "*"
 }
 });
 } catch (err: unknown) {
 const e = err as Error;
 console.error("Erreur dans /api/mocks/update :", e);
 return new Response(e.message || "Bad Request", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
 }
 }
 return null;
}
