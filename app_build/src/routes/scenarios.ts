import { getScenarios, createScenario, updateScenario, deleteScenario, applyScenarioActions, getCollectionFromDb } from "../lib/db";
import { initProxy, mockStates } from "../lib/proxy";
import type { ScenarioAction } from "../lib/api";

export async function handleScenariosRoute(req: Request, url: URL): Promise<Response | null> {
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
 if (!actionsToSave) {
 actionsToSave = Array.from(mockStates.entries())
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
 
 const data = getCollectionFromDb();
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

 return null;
}
