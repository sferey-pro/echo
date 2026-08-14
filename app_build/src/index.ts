import { serve } from "bun";
import index from "./index.html";
import { parseCollection } from "./lib/parser";
import { resolve } from "path";

const server = serve({
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/api/collections') {
      const collectionPath = process.env.BRUNO_COLLECTION_PATH || resolve(process.cwd(), '../examples/Swagger Petstore');
      try {
        const data = await parseCollection(collectionPath);
        return Response.json(data);
      } catch (error) {
        console.error("Error parsing collection:", error);
        return Response.json({ error: "Failed to parse collection" }, { status: 500 });
      }
    }

    if (url.pathname === '/echo-logo.jpg') {
      return new Response(Bun.file("./public/echo-logo.jpg"));
    }

    // fallback to React app
    return new Response(Bun.file("./index.html"));
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
