import { http, HttpResponse } from 'msw';
import type { ApiRequest } from './parser';
export interface MockState {
  isMocked: boolean;
  payload: string;
  isStarred: boolean;
  selectedExample: string | null;
  statusCode: number;
  latencyMs: number;
}

export const mockStates = new Map<string, MockState>();
let isInitialized = false;

import { getMockStates, getSetting } from './db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mswServer: any = null;

export async function initProxy(requests: ApiRequest[], environments: { name: string, variables: { name: string, value: string }[] }[] = []) {
  const targetApiUrl = getSetting('TARGET_API_URL') || process.env.TARGET_API_URL || "http://localhost:8080";
  const activeEnvironmentName = getSetting('ACTIVE_ENVIRONMENT');
  const activeEnv = environments.find(e => e.name === activeEnvironmentName) || null;
  const persistedStates = getMockStates();

  for (const req of requests) {
    const pState = persistedStates[req.id];
    mockStates.set(req.id, {
      isMocked: pState ? pState.isMocked : false,
      payload: pState ? pState.payload : (req.examples?.[0]?.response?.body?.data || '{}'),
      isStarred: pState ? pState.isStarred : false,
      selectedExample: pState ? pState.selectedExample : null,
      statusCode: pState ? pState.statusCode : 200,
      latencyMs: pState ? pState.latencyMs : 0,
    });
  }

  const handlers = requests.map(req => {
    const method = req.method.toLowerCase() as keyof typeof http;
    
    let mswPath = req.url;
    // Remplace les variables d'environnement actives
    if (activeEnv) {
      for (const v of activeEnv.variables) {
        mswPath = mswPath.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), v.value);
      }
    }
    // Fallback baseUrl si non défini
    mswPath = mswPath.replace(/\{\{baseUrl\}\}/g, targetApiUrl);
    
    // Éviter les doubles slashes accidentels (sauf pour http://)
    mswPath = mswPath.replace(/([^:])\/\//g, '$1/');

    // Si la méthode n'existe pas dans MSW (ex: HEAD), on utilise 'all'
    const mswMethod = http[method] || http.all;

    return mswMethod(mswPath, async () => {
      const state = mockStates.get(req.id);
      if (state && state.isMocked) {
        if (state.latencyMs && state.latencyMs > 0) {
          await new Promise(r => setTimeout(r, state.latencyMs));
        }
        
        console.log(`[MSW] Intercepted & Mocked: ${mswPath} (Status: ${state.statusCode}, Latency: ${state.latencyMs}ms)`);
        
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Expose-Headers": "*"
        };

        try {
          return HttpResponse.json(JSON.parse(state.payload), { headers: corsHeaders, status: state.statusCode });
        } catch {
          return new HttpResponse(state.payload, { headers: corsHeaders, status: state.statusCode });
        }
      }
      return; // Pass-through : on laisse la requête filer vers l'API cible
    });
  });

  if (!isInitialized) {
    isInitialized = true;
    const moduleName = 'msw/node';
    const { setupServer } = await import(moduleName);
    mswServer = setupServer(...handlers);
    mswServer.listen({ onUnhandledRequest: 'bypass' });
  } else {
    // Reset existing MSW server with new handlers (for hot-reload on settings update)
    if (mswServer) {
      mswServer.resetHandlers(...handlers);
    }
  }
}

export async function handleProxyRequest(req: Request): Promise<Response> {
  const targetApiUrl = getSetting('TARGET_API_URL') || process.env.TARGET_API_URL || "http://localhost:8080";
  const url = new URL(req.url);
  const realUrl = targetApiUrl + url.pathname + url.search;
  
  console.log(`[PROXY] ${req.method} ${url.pathname} -> ${realUrl}`);
  
  try {
    const proxyHeaders = new Headers();
    
    // Copy only safe headers
    const unsafeHeaders = ['host', 'origin', 'referer', 'connection', 'accept-encoding', 'content-length'];
    req.headers.forEach((value, key) => {
      if (!unsafeHeaders.includes(key.toLowerCase()) && !key.startsWith(':')) {
        proxyHeaders.set(key, value);
      }
    });

    let proxyReq: Request;
    if (req.method === 'GET' || req.method === 'HEAD') {
      proxyReq = new Request(realUrl, {
        method: req.method,
        headers: proxyHeaders,
      });
    } else {
      proxyReq = new Request(realUrl, {
        method: req.method,
        headers: proxyHeaders,
        body: await req.arrayBuffer(),
      });
    }
    const response = await fetch(proxyReq);
    
    // Inject CORS headers to real responses so the frontend is never blocked
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (err: unknown) {
    const e = err as Error;
    console.error("[PROXY ERROR]", e);
    return new Response(e.stack || String(e), { status: 500 });
  }
}
