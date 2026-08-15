import { serve } from "bun";
import index from "./index.html";
import { handleProxyRequest } from "./lib/proxy";
import { getRepoPath, runSync, updateBackgroundTasks } from "./services/git";

// Routes
import { handleCollectionsRoute } from "./routes/collections";
import { handleMocksRoute } from "./routes/mocks";
import { handleSettingsRoute } from "./routes/settings";
import { handleSyncRoute } from "./routes/sync";
import { handleRepositoriesRoute } from "./routes/repositories";
import { handleScenariosRoute } from "./routes/scenarios";
import { handleResetRoute } from "./routes/reset";

const PORT = 3000;

const server = serve({
  port: PORT,
  routes: {
    "/echo-logo.jpg": Bun.file("./public/echo-logo.jpg"),
    "/": index,
  },

  async fetch(req) {
    const url = new URL(req.url);

    // Cors preflight for all requests (API and Proxy)
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "*"
        }
      });
    }

    // Try routing through our extracted route handlers
    const handlers = [
      handleCollectionsRoute,
      handleMocksRoute,
      handleSettingsRoute,
      handleSyncRoute,
      handleRepositoriesRoute,
      handleScenariosRoute,
      handleResetRoute
    ];

    for (const handler of handlers) {
      const response = await handler(req, url);
      if (response) {
        return response;
      }
    }

    // Tout ce qui ne correspond ni aux routes (SPA), ni à l'API interne, part vers le proxy MSW !
    return handleProxyRequest(req);
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,
    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Unified Echo Server running at ${server.url} (Dashboard, API & Proxy)`);
console.log(`📂 Using Repo Path: ${getRepoPath()}`);

// Initial start
updateBackgroundTasks();
runSync();
