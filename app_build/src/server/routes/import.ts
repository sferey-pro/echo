import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getSafeRepoPath } from "../../shared/lib/paths";
import { db, setSetting } from "../lib/db/index";
import { runSync } from "../services/git";

export async function handleImportRoute(
  req: Request,
  url: URL,
): Promise<Response | null> {
  if (url.pathname === "/api/import" && req.method === "POST") {
    try {
      const body = await req.json();
      const { targetName, exportData } = body;

      if (!targetName || typeof targetName !== "string" || !exportData) {
        return new Response("Bad Request: Missing parameters", { status: 400 });
      }

      const repoUrl = exportData.repository?.url;
      const commitSha = exportData.repository?.commitSha;

      if (!repoUrl) {
        return new Response(
          "Bad Request: Invalid export data, missing repo URL",
          { status: 400 },
        );
      }

      const targetDir = getSafeRepoPath(targetName);
      if (
        targetDir.endsWith(".empty") ||
        targetDir === resolve(process.cwd(), "collection")
      ) {
        return new Response("Forbidden", { status: 403 });
      }

      if (existsSync(targetDir)) {
        return new Response(
          JSON.stringify({ error: "Ce nom de collection existe déjà." }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Clone
      const cloneProc = Bun.spawn(["git", "clone", repoUrl, targetDir], {
        stdout: "pipe",
        stderr: "pipe",
      });
      await cloneProc.exited;
      if (cloneProc.exitCode !== 0) {
        const errText = await new Response(cloneProc.stderr).text();
        return new Response(
          JSON.stringify({ error: `Erreur de clonage: ${errText}` }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      if (commitSha) {
        const checkoutProc = Bun.spawn(["git", "checkout", commitSha], {
          cwd: targetDir,
          stdout: "pipe",
          stderr: "pipe",
        });
        await checkoutProc.exited;
        if (checkoutProc.exitCode !== 0) {
          console.warn(`Could not checkout commit ${commitSha}`);
        }
      }

      // Merge DB state
      const state = exportData.echoState;
      if (state) {
        // Import settings
        if (state.settings) {
          for (const [key, value] of Object.entries(state.settings)) {
            setSetting(key, value as string, "global");
          }
        }

        // Import mock variants
        if (state.mockVariants) {
          const insertVariant = db.query(`
            INSERT INTO mock_variants (id, collection_name, request_id, name, is_mocked, payload, selected_example, status_code, latency_ms, path_params_overrides)
            VALUES ($id, $col, $reqId, $name, $isMocked, $payload, $selectedExample, $statusCode, $latencyMs, $pathParamsOverrides)
            ON CONFLICT(id, collection_name) DO UPDATE SET
              request_id=excluded.request_id, name=excluded.name, is_mocked=excluded.is_mocked, payload=excluded.payload, selected_example=excluded.selected_example, status_code=excluded.status_code, latency_ms=excluded.latency_ms, path_params_overrides=excluded.path_params_overrides
          `);
          for (const [reqId, variants] of Object.entries(state.mockVariants)) {
            for (const variant of variants as {
              id: string;
              name: string;
              isMocked: boolean;
              payload: string;
              selectedExample?: string;
              statusCode?: number;
              latencyMs?: number;
              pathParamsOverrides?: unknown;
            }[]) {
              insertVariant.run({
                $id: variant.id,
                $col: targetName,
                $reqId: reqId,
                $name: variant.name,
                $isMocked: variant.isMocked ? 1 : 0,
                $payload: variant.payload,
                $selectedExample: variant.selectedExample || null,
                $statusCode: variant.statusCode || 200,
                $latencyMs: variant.latencyMs || 0,
                $pathParamsOverrides: variant.pathParamsOverrides
                  ? JSON.stringify(variant.pathParamsOverrides)
                  : null,
              });
            }
          }
        }

        // Import scenarios
        if (state.scenarios) {
          const insertScenario = db.query(`
            INSERT INTO scenarios (id, collection_name, name, actions)
            VALUES ($id, $col, $name, $actions)
            ON CONFLICT(id, collection_name) DO UPDATE SET
              name=excluded.name, actions=excluded.actions
          `);
          for (const scenario of (state.scenarios as {
            id: string;
            name: string;
            actions?: unknown;
          }[]) || []) {
            insertScenario.run({
              $id: scenario.id,
              $col: targetName,
              $name: scenario.name,
              $actions: JSON.stringify(scenario.actions),
            });
          }
        }

        // Import request meta
        if (state.requestMeta) {
          const insertMeta = db.query(`
            INSERT INTO request_meta (request_id, collection_name, is_starred)
            VALUES ($id, $col, $isStarred)
            ON CONFLICT(request_id, collection_name) DO UPDATE SET
              is_starred=excluded.is_starred
          `);
          for (const [reqId, meta] of Object.entries(state.requestMeta)) {
            insertMeta.run({
              $id: reqId,
              $col: targetName,
              $isStarred: (meta as { isStarred?: boolean }).isStarred ? 1 : 0,
            });
          }
        }
      }

      setSetting("ACTIVE_COLLECTION_NAME", targetName, "global");
      runSync();

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
