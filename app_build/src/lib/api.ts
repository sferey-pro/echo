import type { ParserResult } from './parser';

export async function fetchCollection(): Promise<ParserResult> {
  const response = await fetch('/api/collections');
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération de la collection Bruno');
  }
  return response.json();
}
