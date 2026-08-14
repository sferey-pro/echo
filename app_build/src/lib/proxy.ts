import { http, HttpResponse } from 'msw';
import type { ApiRequest } from './parser';
export interface MockState {
  isMocked: boolean;
  payload: string;
}

export const mockStates = new Map<string, MockState>();
let isInitialized = false;

import { getMockStates } from './db';

export async function initProxy(requests: ApiRequest[]) {
  if (isInitialized) return; // Prevent multiple setups if HMR triggers
  isInitialized = true;

  const targetApiUrl = process.env.TARGET_API_URL || "http://localhost:8080";
  const persistedStates = getMockStates();

  for (const req of requests) {
    const pState = persistedStates[req.id];
    mockStates.set(req.id, {
      isMocked: pState ? pState.isMocked : false,
      payload: pState ? pState.payload : (req.examples?.[0]?.response?.body?.data || '{}'),
    });
  }

  const handlers = requests.map(req => {
    // Le cast ici est sûr, on suppose que les méthodes sont valides
    const method = req.method.toLowerCase() as keyof typeof http;
    
    // Remplacer {{baseUrl}} ou tout autre variable par la cible réelle
    let mswPath = req.url.replace(/\{\{[^}]+\}\}/g, targetApiUrl);
    // Éviter les doubles slashes accidentels (sauf pour http://)
    mswPath = mswPath.replace(/([^:])\/\//g, '$1/');

    // Si la méthode n'existe pas dans MSW (ex: HEAD), on utilise 'all'
    const mswMethod = http[method] || http.all;

    return mswMethod(mswPath, () => {
      const state = mockStates.get(req.id);
      if (state && state.isMocked) {
        console.log(`[MSW] Intercepted & Mocked: ${mswPath}`);
        
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Expose-Headers": "*"
        };

        try {
          return HttpResponse.json(JSON.parse(state.payload), { headers: corsHeaders });
        } catch {
          return new HttpResponse(state.payload, { headers: corsHeaders });
        }
      }
      return; // Pass-through : on laisse la requête filer vers l'API cible
    });
  });

  // Use dynamic import with variable to hide it from Bun's browser bundler analyzer
  const moduleName = 'msw/node';
  const { setupServer } = await import(moduleName);
  const mswServer = setupServer(...handlers);
  mswServer.listen({ onUnhandledRequest: 'bypass' });
}

export async function handleProxyRequest(req: Request, targetApiUrl: string): Promise<Response> {
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
  } catch (err: any) {
    console.error("[PROXY ERROR]", err);
    return new Response(err.stack || String(err), { status: 500 });
  }
}
