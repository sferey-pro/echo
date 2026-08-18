import type { MockVariantDef } from "@/shared/schemas";
import type { ParserResult } from "../../shared/lib/parser";

export async function fetchCollection(): Promise<ParserResult> {
  const response = await fetch("/api/collections");
  if (!response.ok) {
    throw new Error("Erreur lors de la récupération de la collection Bruno");
  }
  return response.json();
}

export async function updateRequestMeta(
  id: string,
  isStarred: boolean,
): Promise<void> {
  const response = await fetch("/api/mocks/meta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, isStarred }),
  });
  if (!response.ok)
    throw new Error("Erreur lors de la mise à jour des métadonnées");
}

export async function createMockVariant(
  requestId: string,
  name: string,
): Promise<string> {
  const response = await fetch("/api/mocks/variants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, name }),
  });
  if (!response.ok)
    throw new Error("Erreur lors de la création de la variante");
  const data = await response.json();
  return data.id;
}

export async function updateMockVariant(
  id: string,
  updates: Partial<MockVariantDef>,
): Promise<void> {
  const response = await fetch(`/api/mocks/variants/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok)
    throw new Error("Erreur lors de la mise à jour de la variante");
}

export async function deleteMockVariant(id: string): Promise<void> {
  const response = await fetch(`/api/mocks/variants/${id}`, {
    method: "DELETE",
  });
  if (!response.ok)
    throw new Error("Erreur lors de la suppression de la variante");
}

export async function getSettings(): Promise<Record<string, string>> {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    throw new Error("Erreur lors de la récupération des paramètres");
  }
  return response.json();
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!response.ok) {
    throw new Error("Erreur lors de la mise à jour du paramètre");
  }
}

export interface ScenarioAction {
  requestId: string;
  isMocked: boolean;
  statusCode: number;
  latencyMs: number;
  payload: string;
  selectedExample: string | null;
  pathParamsOverrides: Record<string, string>;
}

export interface Scenario {
  id: string;
  name: string;
  actions: ScenarioAction[];
}

export async function fetchScenarios(): Promise<Scenario[]> {
  const response = await fetch("/api/scenarios");
  if (!response.ok)
    throw new Error("Erreur lors de la récupération des scénarios");
  return response.json();
}

export async function createScenario(
  name: string,
  actions?: ScenarioAction[],
): Promise<void> {
  const response = await fetch("/api/scenarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, actions }),
  });
  if (!response.ok) throw new Error("Erreur lors de la création du scénario");
}

export async function applyScenario(id: string): Promise<void> {
  const response = await fetch("/api/scenarios/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) throw new Error("Erreur lors de l'application du scénario");
}

export async function updateScenario(
  id: string,
  name: string,
  actions: ScenarioAction[],
): Promise<void> {
  const response = await fetch(`/api/scenarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, actions }),
  });
  if (!response.ok)
    throw new Error("Erreur lors de la mise à jour du scénario");
}

export async function deleteScenario(id: string): Promise<void> {
  const response = await fetch(`/api/scenarios/${id}`, {
    method: "DELETE",
  });
  if (!response.ok)
    throw new Error("Erreur lors de la suppression du scénario");
}

export const exportCollection = async () => {
  window.open("/api/export", "_blank");
};

export const importCollection = async (
  targetName: string,
  exportData: unknown,
) => {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetName, exportData }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to import collection");
  }
};

export async function resetApplication(): Promise<void> {
  const response = await fetch("/api/reset", {
    method: "POST",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || "Erreur lors de la réinitialisation de l'application",
    );
  }
}
