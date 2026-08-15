import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { resolve } from "path";
import { getRepoPath } from "../services/git";

export async function handleRepositoriesRoute(req: Request, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/repositories' && req.method === 'GET') {
    try {
      const collDir = resolve(process.cwd(), '../collection');
      if (!existsSync(collDir)) {
         return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
      const entries = await readdir(collDir, { withFileTypes: true });
      const repos = entries.filter((e: Dirent) => e.isDirectory()).map((e: Dirent) => e.name);
      return new Response(JSON.stringify(repos), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    } catch (err: unknown) {
       return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
  }

  if (url.pathname === '/api/repositories/clone' && req.method === 'POST') {
    try {
      const body = await req.json();
      const repoUrl = body.repoUrl;
      const force = body.force;
      if (!repoUrl || typeof repoUrl !== 'string') {
        return new Response("Bad Request", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
      }
      
      let repoName = `repo-${Date.now()}`;
      const parts = repoUrl.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
         repoName = lastPart.replace(/\.git$/, '');
      }
      const targetDir = resolve(process.cwd(), '../collection', repoName);
      
      if (existsSync(targetDir) && !force) {
        return new Response(JSON.stringify({ error: "EXISTS" }), { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
      
      const rmProc = Bun.spawn(["rm", "-rf", targetDir], { stdout: "pipe", stderr: "pipe" });
      await rmProc.exited;
      
      const proc = Bun.spawn(["git", "clone", repoUrl, targetDir], { stdout: "pipe", stderr: "pipe" });
      await proc.exited;
      
      if (proc.exitCode !== 0) {
         const errText = await new Response(proc.stderr).text();
         console.error("Git clone failed:", errText);
         return new Response(JSON.stringify({ error: "Git clone failed: " + errText }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
      
      return new Response(JSON.stringify({ success: true, name: repoName }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (err: unknown) {
       const e = err as Error;
       console.error("Clone error", e);
       return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
  }

  const matchDelete = url.pathname.match(/^\/api\/repositories\/(.+)$/);
  if (matchDelete && req.method === 'DELETE') {
     try {
       const repoName = matchDelete[1];
       if (!repoName) return new Response("Bad Request", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
       // Protect against path traversal
       if (repoName.includes('..') || repoName.includes('/')) {
          return new Response("Forbidden", { status: 403, headers: { "Access-Control-Allow-Origin": "*" } });
       }
       const targetDir = resolve(process.cwd(), '../collection', repoName);
       if (!existsSync(targetDir)) {
          return new Response("Not found", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
       }
       
       const rmProc = Bun.spawn(["rm", "-rf", targetDir], { stdout: "pipe", stderr: "pipe" });
       await rmProc.exited;
       
       if (rmProc.exitCode !== 0) {
          const errText = await new Response(rmProc.stderr).text();
          return new Response(JSON.stringify({ error: "Failed to delete: " + errText }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
       }
       
       return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
     } catch (err: unknown) {
       return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
     }
  }

  return null;
}
