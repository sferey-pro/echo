import {
  getScenarios,
  createScenario,
  updateScenario,
  deleteScenario,
  applyScenarioActions,
  getCollectionFromDb,
} from "../lib/db/index";
import { initProxy, mockVariants } from "../lib/proxy";
import type { ScenarioAction } from "../../client/lib/api";

export async function handleScenariosRoute(
  req: Request,
  url: URL,
): Promise<Response | null> {
  if (url.pathname === "/api/scenarios" && req.method === "GET") {
    try {
      const scenarios = getScenarios();
      return new Response(JSON.stringify(scenarios), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (url.pathname === "/api/scenarios" && req.method === "POST") {
    try {
      const body = await req.json();
      if (!body.name)
        return new Response("Bad Request: missing name", {
          status: 400,
          headers: {},
        });

      let actionsToSave = body.actions;
      if (!actionsToSave) {
        actionsToSave = [];
        for (const [reqId, variants] of mockVariants.entries()) {
          for (const state of variants) {
            if (state.isMocked) {
              actionsToSave.push({
                requestId: reqId,
                variantId: state.id,
                payload: state.payload,
                statusCode: state.statusCode,
                latencyMs: state.latencyMs,
                selectedExample: state.selectedExample,
                pathParamsOverrides: state.pathParamsOverrides,
              });
            }
          }
        }
      }

      const id = `scenario-${crypto.randomUUID()}`;
      createScenario(id, body.name, actionsToSave);

      return new Response(JSON.stringify({ success: true, id }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (url.pathname === "/api/scenarios/apply" && req.method === "POST") {
    try {
      const body = await req.json();
      if (!body.id)
        return new Response("Bad Request: missing id", {
          status: 400,
          headers: {},
        });

      const scenarios = getScenarios();
      const scenario = scenarios.find((s) => s.id === body.id);
      if (!scenario)
        return new Response("Scenario not found", { status: 404, headers: {} });

      applyScenarioActions(scenario.actions as ScenarioAction[]);

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

  const matchDeleteScenario = url.pathname.match(/^\/api\/scenarios\/(.+)$/);
  if (matchDeleteScenario && req.method === "DELETE") {
    try {
      const id = matchDeleteScenario[1];
      if (!id) return new Response("Bad Request", { status: 400, headers: {} });
      deleteScenario(id);
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

  const matchUpdateScenario = url.pathname.match(/^\/api\/scenarios\/(.+)$/);
  if (matchUpdateScenario && req.method === "PUT") {
    try {
      const id = matchUpdateScenario[1];
      if (!id) return new Response("Bad Request", { status: 400, headers: {} });
      const body = await req.json();
      if (!body.name || !Array.isArray(body.actions))
        return new Response("Bad Request: missing name or invalid actions", {
          status: 400,
          headers: {},
        });

      updateScenario(id, body.name, body.actions);
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
