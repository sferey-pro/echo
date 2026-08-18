import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ApiRequest } from "../../../shared/lib/parser";
import * as api from "../../lib/api";
import { fireEvent, render, screen, waitFor } from "../../test-utils";
import { ScenarioEditor } from "./ScenarioEditor";

mock.module("../../lib/api", () => ({
  fetchScenarios: mock(() =>
    Promise.resolve([
      {
        id: "s1",
        name: "Test Scenario",
        actions: [
          {
            requestId: "req1",
            isMocked: true,
            statusCode: 200,
            latencyMs: 100,
            payload: "{}",
            selectedExample: null,
            pathParamsOverrides: {},
          },
        ],
      },
    ]),
  ),
  updateScenario: mock(() => Promise.resolve()),
}));

describe("Component: ScenarioEditor", () => {
  const mockRequests: ApiRequest[] = [
    {
      id: "req1",
      name: "Get User",
      method: "GET",
      url: "/users/1",
      folderId: "f1",
      examples: [],
    },
    {
      id: "req2",
      name: "Create User",
      method: "POST",
      url: "/users",
      folderId: "f1",
      examples: [],
    },
  ];

  beforeEach(() => {
    (api.updateScenario as ReturnType<typeof mock>).mockClear();
  });

  it("renders scenario details and requests", async () => {
    const onClose = mock();
    render(
      <ScenarioEditor
        scenarioId="s1"
        requests={mockRequests}
        onClose={onClose}
      />,
    );

    // Wait for data to load
    const title = await screen.findByDisplayValue("Test Scenario");
    expect(title).toBeDefined();

    // The action for req1 should be displayed
    expect(screen.getByText("Get User")).toBeDefined();
    expect(screen.getByText("🟢 200 OK")).toBeDefined(); // Status code input/text
  });

  it("allows adding a new request to scenario", async () => {
    const onClose = mock();
    render(
      <ScenarioEditor
        scenarioId="s1"
        requests={mockRequests}
        onClose={onClose}
      />,
    );
    await screen.findByDisplayValue("Test Scenario");

    // Click Add
    const addBtn = screen.getByText("+ Ajouter une requête");
    fireEvent.click(addBtn);

    // Search for req2
    const input = screen.getByPlaceholderText(/Rechercher une requête/i);
    fireEvent.change(input, { target: { value: "Create User" } });

    // Click the result
    const result = screen.getByText("Create User");
    fireEvent.click(result);

    // Both should be in the list now
    expect(screen.getByText("Get User")).toBeDefined();
    expect(screen.getAllByText("Create User").length).toBeGreaterThan(0);
  });

  it("saves changes and calls onUpdate", async () => {
    const onClose = mock();
    const onUpdate = mock();
    render(
      <ScenarioEditor
        scenarioId="s1"
        requests={mockRequests}
        onClose={onClose}
        onUpdate={onUpdate}
      />,
    );
    await screen.findByDisplayValue("Test Scenario");

    // Click save
    const saveBtn = screen.getByText("Sauvegarder");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateScenario).toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalled();
    });
  });
});
