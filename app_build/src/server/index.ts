import path from "node:path";
import { serve } from "bun";

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Global] Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[Global] Uncaught Exception:", err);
});

import index from "../client/index.html";
import { handleProxyRequest } from "./lib/proxy";
// Routes
import { handleCollectionsRoute } from "./routes/collections";
import { handleExportRoute } from "./routes/export";
import { handleImportRoute } from "./routes/import";
import { handleMocksRoute } from "./routes/mocks";
import { handleRepositoriesRoute } from "./routes/repositories";
import { handleResetRoute } from "./routes/reset";
import { handleScenariosRoute } from "./routes/scenarios";
import { handleSettingsRoute } from "./routes/settings";
import { handleSyncRoute } from "./routes/sync";
import { getRepoPath, runSync, updateBackgroundTasks } from "./services/git";

let PORT = parseInt(process.env.PORT || "3000", 10);
let server: ReturnType<typeof serve> | undefined;

const isProd = process.env.NODE_ENV === "production";

const startServer = () => {
  try {
    server = serve({
      port: PORT,
      hostname: "127.0.0.1",
      routes: isProd
        ? undefined
        : {
            "/echo-logo.jpg": Bun.file("./public/echo-logo.jpg"),
            "/": index,
            "/_hmr": index,
          },

      async fetch(req) {
        const url = new URL(req.url);

        if (url.pathname === "/health") {
          return new Response(
            JSON.stringify({ status: "ok", uptime: process.uptime() }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (url.pathname === "/favicon.ico") {
          return new Response(null, { status: 204 });
        }

        if (isProd && req.method === "GET") {
          // Ignore proxy-like requests or API requests for static files
          if (!url.pathname.startsWith("/api/")) {
            const filePath = path.join(
              process.cwd(),
              "dist",
              url.pathname === "/" ? "index.html" : url.pathname,
            );
            const file = Bun.file(filePath);
            if (await file.exists()) {
              return new Response(file);
            }
            // SPA fallback
            if (req.headers.get("accept")?.includes("text/html")) {
              return new Response(
                Bun.file(path.join(process.cwd(), "dist", "index.html")),
              );
            }
          }
        } else if (
          !isProd &&
          req.method === "GET" &&
          !url.pathname.startsWith("/api/")
        ) {
          // SPA fallback in development mode for non-API routes
          if (req.headers.get("accept")?.includes("text/html")) {
            return new Response(Bun.file("./src/client/index.html"));
          }
        }

        let maybeResponse: Response | null = null;
        if (url.pathname.startsWith("/api/settings"))
          maybeResponse = await handleSettingsRoute(req, url);
        if (!maybeResponse && url.pathname.startsWith("/api/scenarios"))
          maybeResponse = await handleScenariosRoute(req, url);
        if (!maybeResponse && url.pathname.startsWith("/api/reset"))
          maybeResponse = await handleResetRoute(req, url);
        if (!maybeResponse && url.pathname === "/api/export")
          maybeResponse = await handleExportRoute(req, url);
        if (!maybeResponse && url.pathname === "/api/import")
          maybeResponse = await handleImportRoute(req, url);
        if (maybeResponse) return maybeResponse;

        if (url.pathname.startsWith("/api/")) {
          const response =
            (await handleCollectionsRoute(req, url)) ||
            (await handleMocksRoute(req, url)) ||
            (await handleSyncRoute(req, url)) ||
            (await handleRepositoriesRoute(req, url));

          if (response) {
            if (response.status >= 500) {
              console.error(
                `[API] ${req.method} ${url.pathname} - ${response.status}`,
              );
            } else {
              console.log(
                `[API] ${req.method} ${url.pathname} - ${response.status}`,
              );
            }
            return response;
          }
        }

        return handleProxyRequest(req);
      },

      error(err) {
        console.error("Unhandled server error:", err);
        return new Response(
          JSON.stringify({ error: err.message || "Internal Server Error" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      },

      development: process.env.NODE_ENV !== "production" && {
        hmr: true,
        console: true,
      },
    });

    console.log(
      `🚀 Unified Echo Server running at ${server.url} (Dashboard, API & Proxy)`,
    );
    console.log(`📂 Using Repo Path: ${getRepoPath()}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
  } catch (err: any) {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️ Port ${PORT} in use, trying ${PORT + 1}...`);
      PORT++;
      startServer();
    } else {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
  }
};

startServer();

// Initial start
updateBackgroundTasks();
runSync();

const shutdown = () => {
  console.log("🛑 Shutting down server gracefully...");
  if (server) server.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
