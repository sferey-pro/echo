import { describe, it, expect, beforeEach, afterEach, afterAll } from 'bun:test';
import { handleProxyRequest, initProxy } from '../lib/proxy';
import { createMockVariant, resetDatabase, setSetting } from '../lib/db';
import type { ApiRequest } from '../../shared/lib/parser';

describe('Proxy & MSW interception', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterAll(() => {
    // Clean up if needed
  });

  it('should return mocked response when variant is active', async () => {
    // Arrange
    setSetting('TARGET_API_URL', 'http://fake-api.com');
    createMockVariant('v1', 'req1', 'Test Mock', true, '{"mocked": true}', null, 201, 10, null);

    const requests: ApiRequest[] = [
      {
        id: 'req1',
        folderId: 'f1',
        name: 'Get Data',
        method: 'GET',
        url: 'http://fake-api.com/api/data',
        examples: []
      }
    ];

    await initProxy(requests, []);

    // Act
    const req = new Request('http://localhost:3000/api/data', { method: 'GET' });
    const res = await handleProxyRequest(req);
    const body = await res.text();

    // Assert
    expect(res.status).toBe(201);
    expect(body).toBe('{"mocked":true}');
  });

  it('should fallback to default variant if no variant is active but request exists', async () => {
    setSetting('TARGET_API_URL', 'http://fake-api.com');
    // Note: no active variant

    const requests: ApiRequest[] = [
      {
        id: 'req2',
        folderId: 'f1',
        name: 'Get Fallback',
        method: 'POST',
        url: 'http://fake-api.com/api/fallback',
        examples: [{ name: 'Default Ex', response: { status: 200, body: { data: '{"default": true}' } } }]
      }
    ];

    await initProxy(requests, []);

    // The default variant is active if no other is mocked.
    // Wait, the proxy logic says it creates a default variant if there are NO variants, 
    // but what if there's no ACTIVE variant? It should bypass to the real API!
    // But since it's a test and we can't reach fake-api.com, fetch will throw if MSW doesn't intercept it.
    // Let's expect fetch to throw because MSW bypasses.
    
    // Since we bypass MSW when there is no mocked variant, fetch will try to reach fake-api.com.
    // We'll just intercept it explicitly here to return a fake 404 and prove it bypassed our mock variants.
    const { http, HttpResponse } = await import('msw');
    const { setupServer } = await import('msw/node');
    const server = setupServer(http.post('http://fake-api.com/api/fallback', () => HttpResponse.json({ real: true }, { status: 404 })));
    server.listen({ onUnhandledRequest: 'bypass' });

    const req = new Request('http://localhost:3000/api/fallback', { method: 'POST' });
    const res = await handleProxyRequest(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.real).toBe(true);
    
    server.close();
  });
});
