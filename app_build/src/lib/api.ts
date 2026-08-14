import type { ParserResult } from './parser';

export async function fetchCollection(): Promise<ParserResult> {
  const response = await fetch('/api/collections');
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération de la collection Bruno');
  }
  return response.json();
}

export async function updateMock(id: string, updates: { isMocked?: boolean, payload?: string }): Promise<void> {
  const response = await fetch('/api/mocks/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates })
  });
  if (!response.ok) {
    throw new Error('Erreur lors de la mise à jour du mock');
  }
}
