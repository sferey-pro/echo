import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ApiRequest } from "../../../../shared/lib/parser";
import { fireEvent, render, screen } from "../../../test-utils";
import { VariantEditor } from "./VariantEditor";


describe("Component: VariantEditor", () => {
  const mockRequest = {
    id: "req1",
    name: "Get Users",
    method: "GET",
    url: "/users",
    folderId: "root",
    examples: [
      {
        name: "Success",
        response: { body: { data: '{"status":"ok"}' } },
      },
    ],
  } as unknown as ApiRequest;

  const mockVariant = {
    id: "v1",
    name: "Default",
    isMocked: true,
    statusCode: 200,
    latencyMs: 100,
    payload: '{"status":"ok"}',
    selectedExample: null,
    pathParamsOverrides: {},
  };

  const defaultProps = {
    request: mockRequest,
    activeVariant: mockVariant,
    isTogglingMock: false,
    isSavingPayload: false,
    onToggleMock: mock(),
    onSavePayload: mock(),
    statusCode: 200,
    onStatusChange: mock(),
    latencyMs: 100,
    onLatencyChange: mock(),
    selectedExample: "Success",
    onExampleChange: mock(),
    payload: '{"status":"ok"}',
    onPayloadChange: mock(),
    defaultExamplePayload: '{"status":"ok"}',
    onResetPayload: mock(),
  };

  beforeEach(() => {
    (defaultProps.onToggleMock as ReturnType<typeof mock>).mockClear();
    (defaultProps.onSavePayload as ReturnType<typeof mock>).mockClear();
    (defaultProps.onStatusChange as ReturnType<typeof mock>).mockClear();
    (defaultProps.onLatencyChange as ReturnType<typeof mock>).mockClear();
    (defaultProps.onExampleChange as ReturnType<typeof mock>).mockClear();
    (defaultProps.onPayloadChange as ReturnType<typeof mock>).mockClear();
    (defaultProps.onResetPayload as ReturnType<typeof mock>).mockClear();
  });

  it("renders correctly with provided props", () => {
    render(<VariantEditor {...defaultProps} />);

    // Check buttons
    expect(screen.getByText("Mock Actif pour cette Variante")).toBeDefined();
    expect(screen.getByText("Sauvegarder les modifications")).toBeDefined();

    // Check latency
    expect(screen.getByText("100 ms")).toBeDefined();

    // Check default example
    expect(screen.getByText("Success")).toBeDefined();
  });

  it("triggers onToggleMock when clicking the mock button", () => {
    render(<VariantEditor {...defaultProps} />);
    const toggleBtn = screen.getByText("Mock Actif pour cette Variante");
    fireEvent.click(toggleBtn);
    expect(defaultProps.onToggleMock).toHaveBeenCalled();
  });

  it("triggers onSavePayload when clicking save", () => {
    render(<VariantEditor {...defaultProps} />);
    const saveBtn = screen.getByText("Sauvegarder les modifications");
    fireEvent.click(saveBtn);
    expect(defaultProps.onSavePayload).toHaveBeenCalled();
  });

  it("renders modified payload state correctly", () => {
    render(<VariantEditor {...defaultProps} payload='{"status":"modified"}' />);
    expect(screen.getByText("Surchargé Localement")).toBeDefined();

    const resetBtn = screen.getByText(/Recharger l'original/i);
    fireEvent.click(resetBtn);
    expect(defaultProps.onResetPayload).toHaveBeenCalled();
  });

  it("updates payload via editor", () => {
    render(<VariantEditor {...defaultProps} />);
    const editor = screen.getByTestId("monaco-editor-mock");
    fireEvent.change(editor, { target: { value: '{"new":"data"}' } });
    expect(defaultProps.onPayloadChange).toHaveBeenCalledWith('{"new":"data"}');
  });
});
