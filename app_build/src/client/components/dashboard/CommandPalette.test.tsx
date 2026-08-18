import { describe, expect, it, mock } from "bun:test";
import type { ApiRequest } from "../../../shared/lib/parser";
import { fireEvent, render, screen } from "../../test-utils";
import { CommandPalette } from "./CommandPalette";

describe("Component: CommandPalette", () => {
  const mockRequests = [
    {
      id: "req1",
      name: "Get Users",
      method: "GET",
      url: "/users",
      folderId: "root",
      variants: [{ isMocked: true }],
    },
  ] as unknown as ApiRequest[];

  const defaultProps = {
    open: true,
    setOpen: mock(),
    requests: mockRequests,
    onSelectRequest: mock(),
    onOpenSettings: mock(),
    onOpenCollectionManager: mock(),
  };

  it("renders when open is true", () => {
    render(<CommandPalette {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/Rechercher une requête/i),
    ).toBeDefined();
    expect(screen.getByText("Get Users")).toBeDefined();
    expect(screen.getByText("Paramètres d'Environnement")).toBeDefined();
  });

  it("does not render when open is false", () => {
    render(<CommandPalette {...defaultProps} open={false} />);
    expect(screen.queryByPlaceholderText(/Rechercher une requête/i)).toBeNull();
  });

  it("calls onSelectRequest when selecting a request", () => {
    render(<CommandPalette {...defaultProps} />);
    const item = screen.getByText("Get Users");
    fireEvent.click(item);
    expect(defaultProps.onSelectRequest).toHaveBeenCalledWith("req1");
    expect(defaultProps.setOpen).toHaveBeenCalledWith(false);
  });

  it("calls onOpenSettings when selecting settings command", () => {
    render(<CommandPalette {...defaultProps} />);
    const item = screen.getByText("Paramètres d'Environnement");
    fireEvent.click(item);
    expect(defaultProps.onOpenSettings).toHaveBeenCalled();
    expect(defaultProps.setOpen).toHaveBeenCalledWith(false);
  });
});
