import { getAllSettings, setSetting } from "../lib/db";
import { updateBackgroundTasks } from "../services/git";

export async function handleSettingsRoute(
  req: Request,
  url: URL,
): Promise<Response | null> {
  if (url.pathname === "/api/settings") {
    if (req.method === "GET") {
      return new Response(JSON.stringify(getAllSettings()), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (
          body &&
          typeof body.key === "string" &&
          typeof body.value === "string"
        ) {
          const allowedKeys = [
            "REPO_PATH",
            "ACTIVE_COLLECTION_NAME",
            "TARGET_API_URL",
            "GIT_SYNC_INTERVAL",
            "ACTIVE_ENVIRONMENT",
          ];
          if (!allowedKeys.includes(body.key)) {
            return new Response("Invalid setting key", { status: 400 });
          }
          setSetting(body.key, body.value);

          if (
            body.key === "REPO_PATH" ||
            body.key === "ACTIVE_COLLECTION_NAME"
          ) {
            updateBackgroundTasks();
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch (e: unknown) {
        console.error("Settings parse error", e);
      }
      return new Response("Bad Request", { status: 400, headers: {} });
    }
  }
  return null;
}
