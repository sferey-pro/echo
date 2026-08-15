import { parseCollection } from "../lib/parser";
import { initProxy, mockStates } from "../lib/proxy";
import { getRepoPath } from "../services/git";

export async function handleCollectionsRoute(req: Request, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/collections') {
    try {
      const data = await parseCollection(getRepoPath());
      await initProxy(data.requests, data.environments);
      
      const enrichedRequests = data.requests.map(r => {
        const state = mockStates.get(r.id);
        return {
          ...r,
          isMocked: state?.isMocked || false,
          currentPayload: state?.payload || (typeof r.examples?.[0]?.response?.body?.data === 'string' ? r.examples[0].response.body.data : (r.examples?.[0]?.response?.body?.data ? JSON.stringify(r.examples[0].response.body.data, null, 2) : '')),
          isStarred: state?.isStarred || false,
          selectedExample: state?.selectedExample || null,
          statusCode: state?.statusCode ?? 200,
          latencyMs: state?.latencyMs ?? 0,
          pathParamsOverrides: state?.pathParamsOverrides ?? {}
        };
      });

      return new Response(JSON.stringify({ 
        folders: data.folders,
        requests: enrichedRequests,
        environments: data.environments || []
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error) {
      console.error("Error parsing collection:", error);
      return new Response(JSON.stringify({ error: "Failed to parse collection" }), { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  }
  return null;
}
