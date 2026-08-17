import { serve } from "bun";

process.on('unhandledRejection', (reason, promise) => {
 console.error('[Global] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
 console.error('[Global] Uncaught Exception:', err);
});

import index from "../client/index.html";
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



let PORT = parseInt(process.env.PORT || '3000', 10);
let server: ReturnType<typeof serve> | undefined = undefined;

const startServer = () => {
  try {
    server = serve({
     port: PORT,
     hostname: "127.0.0.1",
     routes: {
     "/echo-logo.jpg": Bun.file("./public/echo-logo.jpg"),
     "/": index,
     "/_hmr": index,
     "/*": index, // SPA Fallback
     },
    
     async fetch(req) {
     const url = new URL(req.url);
    
     if (url.pathname === '/health') {
       return new Response(JSON.stringify({ status: 'ok', uptime: process.uptime() }), {
         headers: { 'Content-Type': 'application/json' }
       });
     }
    
     if (url.pathname.startsWith("/api/")) {
     let response = await handleCollectionsRoute(req, url)
      || await handleMocksRoute(req, url)
      || await handleSettingsRoute(req, url)
      || await handleSyncRoute(req, url)
      || await handleRepositoriesRoute(req, url)
      || await handleScenariosRoute(req, url)
      || await handleResetRoute(req, url);
    
     if (response) {
       if (response.status >= 500) {
         console.error(`[API] ${req.method} ${url.pathname} - ${response.status}`);
       } else {
         console.log(`[API] ${req.method} ${url.pathname} - ${response.status}`);
       }
       return response;
     }
     }
    
     return handleProxyRequest(req);
     },
    
     development: process.env.NODE_ENV !== "production" && {
     hmr: true,
     console: true,
     },
    });

    console.log(`🚀 Unified Echo Server running at ${server.url} (Dashboard, API & Proxy)`);
    console.log(`📂 Using Repo Path: ${getRepoPath()}`);
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
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
  console.log('🛑 Shutting down server gracefully...');
  if (server) server.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
