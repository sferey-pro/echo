import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    // Le futur proxy HTTP (MSW) sera géré ici via des middlewares ou des routes dédiées.
    // Pour l'instant, on sert uniquement le frontend React.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
