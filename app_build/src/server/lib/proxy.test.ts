import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { initProxy, mockVariants, requestMeta } from './proxy';
import * as db from './db';
import * as mswNode from 'msw/node';
import { http, HttpResponse } from 'msw';

let capturedHandler: any = null;
mock.module('msw', () => ({
  http: {
    get: (path: string, handler: any) => {
      capturedHandler = handler;
      return { path, handler };
    },
    all: (path: string, handler: any) => ({ path, handler })
  },
  HttpResponse: class extends Response {
    static override json(data: any, options: any) {
      return new Response(JSON.stringify(data), options);
    }
  }
}));

describe('Service: proxy', () => {
  beforeEach(() => {
    db.resetDatabase();
    mockVariants.clear();
    requestMeta.clear();
    process.env.TARGET_API_URL = 'http://test.api';
  });

  it('should initialize proxy with default variants if none exist', async () => {
    const useMock = mock(() => {});
    const resetHandlersMock = mock(() => {});
    const listenMock = mock(() => {});
    const closeMock = mock(() => {});
    const setupServerMock = mock((...handlers: any[]) => ({
      use: useMock,
      resetHandlers: resetHandlersMock,
      listen: listenMock,
      close: closeMock
    }));
    
    // Setup MSW mock
    mock.module('msw/node', () => ({
      setupServer: setupServerMock
    }));

    await initProxy([
      { id: 'req1', name: 'Get Users', method: 'GET', url: '/users', folderId: 'f1', examples: [] }
    ]);

    const variants = mockVariants.get('req1');
    expect(variants?.length).toBe(1);
    expect(variants?.[0]?.name).toBe('Default');
    expect(variants?.[0]?.isMocked).toBe(false);
  });

  it('should apply environments and path overrides', async () => {
    const useMock = mock(() => {});
    const resetHandlersMock = mock(() => {});
    const listenMock = mock(() => {});
    const closeMock = mock(() => {});
    const setupServerMock = mock((...handlers: any[]) => ({
      use: useMock,
      resetHandlers: resetHandlersMock,
      listen: listenMock,
      close: closeMock
    }));
    mock.module('msw/node', () => ({
      setupServer: setupServerMock
    }));

    // Create a variant with overrides
    db.createMockVariant('var1', 'req2', 'Default', true, '{}', null, 200, 0, { 'userId': '123' });

    db.setSetting('ACTIVE_ENVIRONMENT', 'Env1');

    await initProxy([
      { id: 'req2', name: 'Get User', method: 'GET', url: '/users/{{userId}}', folderId: 'f1', examples: [] }
    ], [
      { name: 'Env1', variables: [{ name: 'baseUrl', value: 'http://my-api' }] }
    ]);

    // Test the captured MSW handler
    expect(capturedHandler).toBeTruthy();
    console.log('mockVariants req2:', mockVariants.get('req2'));
    const res = await capturedHandler();
    console.log('res:', res);
    expect(res).toBeDefined();
    expect(res.status).toBe(200);

    // Test 204 response
    db.createMockVariant('var2', 'req2', 'Default', true, '', null, 204, 0, {});
    await initProxy([
      { id: 'req2', name: 'Get User', method: 'GET', url: '/users', folderId: 'f1', examples: [] }
    ]);
    const res204 = await capturedHandler();
    expect(res204.status).toBe(204);

    // Test invalid JSON payload
    db.createMockVariant('var3', 'req2', 'Default', true, 'invalid JSON {', null, 200, 0, {});
    await initProxy([
      { id: 'req2', name: 'Get User', method: 'GET', url: '/users', folderId: 'f1', examples: [] }
    ]);
    const resBad = await capturedHandler();
    expect(resBad.status).toBe(200);
    expect(await resBad.text()).toBe('invalid JSON {');
  });

  it('should handle proxy pass-through', async () => {
    const { handleProxyRequest } = await import('./proxy');
    const req = new Request('http://localhost:8080/my/api/call');
    req.headers.set('host', 'localhost:8080');
    global.fetch = mock(() => Promise.resolve(new Response('passed-through'))) as any;
    const res = await handleProxyRequest(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('passed-through');
  });
});
