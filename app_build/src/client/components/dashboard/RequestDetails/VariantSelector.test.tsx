import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "../../../test-utils";
import { VariantSelector } from "./VariantSelector";

describe("Component: VariantSelector", () => {
  const mockVariants = [
    {
      id: "v1",
      name: "Default",
      isMocked: true,
      statusCode: 200,
      latencyMs: 100,
      payload: "{}",
      selectedExample: null,
      pathParamsOverrides: {},
    },
    {
      id: "v2",
      name: "Error",
      isMocked: false,
      statusCode: 500,
      latencyMs: 0,
      payload: "{}",
      selectedExample: null,
      pathParamsOverrides: {},
    },
  ];

  const defaultProps = {
    variants: mockVariants,
    activeVariantId: "v1",
    onVariantChange: mock(),
    isSaving: false,
    onCreateVariant: mock(() => Promise.resolve()),
    onDeleteVariant: mock(() => Promise.resolve()),
    onRenameVariant: mock(() => Promise.resolve()),
  };

  beforeEach(() => {
    (defaultProps.onCreateVariant as ReturnType<typeof mock>).mockClear();
    (defaultProps.onDeleteVariant as ReturnType<typeof mock>).mockClear();
    (defaultProps.onRenameVariant as ReturnType<typeof mock>).mockClear();
  });

  it("renders correctly with active variant", () => {
    render(<VariantSelector {...defaultProps} />);
    expect(screen.getByText("Variante active :")).toBeDefined();
    // Select value displays the active variant name
    expect(screen.getByText("Default")).toBeDefined();
  });

  it("handles creating a new variant", async () => {
    render(<VariantSelector {...defaultProps} />);

    const createBtn = screen.getByTitle("Créer une variante");
    fireEvent.pointerDown(createBtn);

    expect(await screen.findByText("Créer une variante")).toBeDefined();
    const input = screen.getByPlaceholderText("Nom de la variante");
    fireEvent.change(input, { target: { value: "New Variant" } });

    const submitBtn = screen.getByText("Créer");
    fireEvent.pointerDown(submitBtn);

    expect(defaultProps.onCreateVariant).toHaveBeenCalledWith("New Variant");
  });

  it("handles renaming a variant", async () => {
    render(<VariantSelector {...defaultProps} />);

    const renameBtn = screen.getByTitle("Renommer la variante");
    fireEvent.pointerDown(renameBtn);

    expect(await screen.findByText("Renommer la variante")).toBeDefined();
    const input = screen.getByPlaceholderText("Nouveau nom");
    fireEvent.change(input, { target: { value: "Renamed Variant" } });

    const submitBtn = screen.getByText("Renommer");
    fireEvent.pointerDown(submitBtn);

    expect(defaultProps.onRenameVariant).toHaveBeenCalledWith(
      "Renamed Variant",
    );
  });

  it("handles deleting a variant", async () => {
    render(<VariantSelector {...defaultProps} />);

    const deleteBtn = screen.getByTitle("Supprimer la variante");
    fireEvent.pointerDown(deleteBtn);

    expect(await screen.findByText("Supprimer la variante ?")).toBeDefined();
    const submitBtn = screen.getByText("Supprimer");
    fireEvent.pointerDown(submitBtn);

    expect(defaultProps.onDeleteVariant).toHaveBeenCalled();
  });
});
