import { test, expect, mock, beforeAll, afterAll } from 'bun:test';
import { render, act } from '@testing-library/react';
import App from './App';

const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = mock(() => Promise.resolve(new Response(JSON.stringify({ folders: [], requests: [] })))) as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

test('l\'application se monte sans erreur', async () => {
  await act(async () => {
    render(<App />);
  });
  // Vérifie simplement que le DOM est généré sans plantage initial
  expect(document.body.innerHTML).not.toBe('');
});
