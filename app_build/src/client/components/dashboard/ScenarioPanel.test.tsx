import { beforeEach, describe, expect, it, mock } from "bun:test";
import * as api from "../../lib/api";
import { useStore } from "../../store/useStore";
import { fireEvent, render, screen, waitFor } from "../../test-utils";
import { ScenarioPanel } from "./ScenarioPanel";

// Mock API
mock.module("../../lib/api", () => ({
  fetchScenarios: mock(() =>
    Promise.resolve([
      { id: "s1", name: "Scenario 1", actions: [] },
      { id: "s2", name: "Scenario 2", actions: [] },
    ]),
  ),
  createScenario: mock(() => Promise.resolve()),
  deleteScenario: mock(() => Promise.resolve()),
  applyScenario: mock(() => Promise.resolve()),
}));

mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
  },
}));

describe("Component: ScenarioPanel", () => {
  beforeEach(() => {
    useStore.setState({
      selectedScenarioId: null,
      loadCollection: mock() as any,
    });
    // Reset mocks
    (api.createScenario as ReturnType<typeof mock>).mockClear();
    (api.applyScenario as ReturnType<typeof mock>).mockClear();
    (api.deleteScenario as ReturnType<typeof mock>).mockClear();
  });

  it("renders scenarios and allows selection", async () => {
    // biome-ignore lint/correctness/noUnusedVariables: Exception (API match) - Variable required for specific function signatures
    const { container } = render(<ScenarioPanel />);

    // Wait for the scenarios to be loaded
    const el = await screen.findByText("Scenario 1");
    expect(el).toBeDefined();
    expect(screen.getByText("Scenario 2")).toBeDefined();

    // Click a scenario to select it
    fireEvent.click(screen.getByText("Scenario 1"));
    expect(useStore.getState().selectedScenarioId).toBe("s1");
  });

  it("allows creating a new scenario", async () => {
    render(<ScenarioPanel />);

    const newBtn = screen.getByText("+ Nouveau");
    fireEvent.click(newBtn);

    const input = screen.getByPlaceholderText(/Nom du scénario/i);
    fireEvent.change(input, { target: { value: "New Scenario" } });

    const saveBtn = screen.getByText("Save");
    fireEvent.click(saveBtn);

    // Wait for API call
    await waitFor(() => {
      expect(api.createScenario).toHaveBeenCalled();
    });
  });

  it("allows applying a scenario", async () => {
    render(<ScenarioPanel />);
    await screen.findByText("Scenario 1");

    // Click Appliquer on the first scenario
    const applyBtns = screen.getAllByText(/Appliquer/);
    expect(applyBtns.length).toBeGreaterThan(0);
    fireEvent.click(applyBtns[0] as HTMLElement);

    await waitFor(() => {
      expect(api.applyScenario).toHaveBeenCalledWith("s1");
      expect(useStore.getState().loadCollection).toHaveBeenCalled();
    });
  });
});
