import type { ParserResult } from './parser';

export async function fetchCollection(): Promise<ParserResult> {
  const response = await fetch('/api/collections');
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération de la collection Bruno');
  }
  return response.json();
}

export async function updateMock(id: string, updates: { isMocked?: boolean, payload?: string, isStarred?: boolean, selectedExample?: string | null }): Promise<void> {
  const response = await fetch('/api/mocks/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates })
  });
  if (!response.ok) {
    throw new Error('Erreur lors de la mise à jour du mock');
  }
}

export async function getSettings(): Promise<Record<string, string>> {
  const response = await fetch('/api/settings');
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des paramètres');
  }
  return response.json();
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value })
  });
  if (!response.ok) {
    throw new Error('Erreur lors de la mise à jour du paramètre');
  }
}

export async function cloneCollection(repoUrl: string, force: boolean = false): Promise<void> {
  const response = await fetch('/api/repositories/clone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl, force })
  });
  if (response.status === 409) {
    throw new Error('EXISTS');
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erreur lors du clonage du dépôt');
  }
}
