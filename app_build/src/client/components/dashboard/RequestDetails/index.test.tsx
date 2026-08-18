import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("../../../client/lib/api", () => ({
  updateMockVariant: async () => ({}),
  saveRequestPayload: async () => ({}),
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useStore } from "../../../store/useStore";
import { RequestDetails } from "./index";

mock.module("@monaco-editor/react", () => {
  return {
    default: () => <div>MonacoEditorMock</div>,
  };
});

describe("Component: RequestDetails", () => {
  beforeEach(() => {
    useStore.setState({
      requests: [],
      environments: [],
      activeEnvironment: undefined,
      selectedRequestId: undefined,
    });
  });

  it("renders empty state when no request is selected", () => {
    render(<RequestDetails />);
    expect(
      screen.getByText("Sélectionnez une requête pour voir les détails"),
    ).toBeTruthy();
  });

  it("renders request details correctly", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
    const req: any = {
      id: "r1",
      folderId: "f1",
      name: "Get User",
      method: "GET",
      url: "/users/:id",
      examples: [],
      variants: [
        {
          id: "v1",
          name: "Success",
          isMocked: true,
          payload: '{"ok":true}',
          statusCode: 200,
          latencyMs: 0,
          selectedExample: null,
          pathParamsOverrides: {},
        },
      ],
    };

    useStore.setState({
      requests: [req],
      selectedRequestId: "r1",
    });

    render(<RequestDetails />);
    screen.debug();
    expect(screen.getByText("Get User")).toBeTruthy();
    expect(screen.getByText("/users/:id")).toBeTruthy();
    expect(screen.getAllByText("GET").length).toBeGreaterThan(0);

    // Test default variant is displayed
    expect(screen.getByText("Success")).toBeTruthy();
  });

  it("handles mock toggle", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
    const req: any = {
      id: "r1",
      folderId: "f1",
      name: "Get User",
      method: "GET",
      url: "/users/:id",
      examples: [],
      variants: [
        {
          id: "v1",
          name: "Success",
          isMocked: true,
          payload: '{"ok":true}',
          statusCode: 200,
          latencyMs: 0,
          selectedExample: null,
          pathParamsOverrides: {},
        },
      ],
    };

    useStore.setState({
      requests: [req],
      selectedRequestId: "r1",
    });

    render(<RequestDetails />);

    const toggleBtn = screen.getByText("Mock Actif pour cette Variante");
    expect(toggleBtn).toBeTruthy();
    fireEvent.click(toggleBtn);
    await waitFor(() => {
      expect(screen.getByText("Activer le Mock (Pass-through)")).toBeTruthy();
    });
  });

  it("handles editing request payload", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
    const req: any = {
      id: "r1",
      folderId: "f1",
      name: "Get User",
      method: "GET",
      url: "/users/:id",
      examples: [],
      variants: [
        {
          id: "v1",
          name: "Success",
          isMocked: true,
          payload: '{"ok":true}',
          statusCode: 200,
          latencyMs: 0,
          selectedExample: null,
          pathParamsOverrides: {},
        },
      ],
    };

    useStore.setState({
      requests: [req],
      selectedRequestId: "r1",
    });

    render(<RequestDetails />);

    // Test saving
    const saveBtn = screen.getByText("Sauvegarder les modifications");
    expect(saveBtn).toBeTruthy();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText("Sauvegarder les modifications")).toBeTruthy();
    });
  });
});
