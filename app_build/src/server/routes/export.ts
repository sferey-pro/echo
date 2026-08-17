import { getRepoPath } from "../services/git";
import {
  getAllSettings,
  getMockVariants,
  getScenarios,
  getRequestMeta,
} from "../lib/db/index";

export async function handleExportRoute(
  req: Request,
  url: URL,
): Promise<Response | null> {
  if (url.pathname === "/api/export" && req.method === "GET") {
    try {
      const repoDir = getRepoPath();

      const remoteUrlProc = Bun.spawn(
        ["git", "config", "--get", "remote.origin.url"],
        { cwd: repoDir, stdout: "pipe", stderr: "pipe" },
      );
      await remoteUrlProc.exited;
      const remoteUrl =
        remoteUrlProc.exitCode === 0
          ? (await new Response(remoteUrlProc.stdout).text()).trim()
          : "";

      const shaProc = Bun.spawn(["git", "rev-parse", "HEAD"], {
        cwd: repoDir,
        stdout: "pipe",
        stderr: "pipe",
      });
      await shaProc.exited;
      const commitSha =
        shaProc.exitCode === 0
          ? (await new Response(shaProc.stdout).text()).trim()
          : "";

      const exportData = {
        version: 1,
        repository: {
          url: remoteUrl,
          commitSha,
        },
        echoState: {
          settings: getAllSettings(),
          mockVariants: getMockVariants(),
          scenarios: getScenarios(),
          requestMeta: getRequestMeta(),
        },
      };

      const repoName =
        remoteUrl.split("/").pop()?.replace(/\.git$/, "") || "collection";

      return new Response(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="echo-export-${repoName}.json"`,
        },
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
