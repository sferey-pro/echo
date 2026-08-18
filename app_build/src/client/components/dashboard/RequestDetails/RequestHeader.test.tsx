import { describe, expect, it, mock } from "bun:test";
import type { ApiRequest } from "../../../../shared/lib/parser";
import { fireEvent, render, screen } from "../../../test-utils";
import { RequestHeader } from "./RequestHeader";

describe("Component: RequestHeader", () => {
  const mockRequest = {
    id: "req1",
    name: "Get Users",
    method: "GET",
    url: "/users/:id/posts/:postId",
    folderId: "root",
  } as unknown as ApiRequest;

  const defaultProps = {
    request: mockRequest,
    isStarred: false,
    onToggleStar: mock(),
    urlParams: { variables: [], pathParams: ["id", "postId"] },
    pathParamsOverrides: { id: "123" },
    onPathParamChange: mock(),
    onPathParamBlur: mock(),
  };

  it("renders basic info correctly", () => {
    render(<RequestHeader {...defaultProps} />);
    expect(screen.getByText("Get Users")).toBeDefined();
    expect(screen.getByText("/users/:id/posts/:postId")).toBeDefined();
    expect(screen.getByText("GET")).toBeDefined(); // From MethodBadge
  });

  it("triggers onToggleStar when clicking star button", () => {
    render(<RequestHeader {...defaultProps} />);
    const starBtn = screen.getByTitle("Ajouter aux favoris");
    fireEvent.click(starBtn);
    expect(defaultProps.onToggleStar).toHaveBeenCalled();
  });

  it("renders path params inputs correctly", () => {
    render(<RequestHeader {...defaultProps} />);
    expect(screen.getByText(":id")).toBeDefined();
    expect(screen.getByText(":postId")).toBeDefined();

    const idInput = screen.getByDisplayValue("123");
    expect(idInput).toBeDefined();
  });

  it("triggers onPathParamChange on input change", () => {
    render(<RequestHeader {...defaultProps} />);
    const idInput = screen.getByDisplayValue("123");
    fireEvent.change(idInput, { target: { value: "456" } });
    expect(defaultProps.onPathParamChange).toHaveBeenCalledWith("id", "456");
  });

  it("triggers onPathParamBlur on input blur", () => {
    render(<RequestHeader {...defaultProps} />);
    const idInput = screen.getByDisplayValue("123");
    fireEvent.blur(idInput);
    expect(defaultProps.onPathParamBlur).toHaveBeenCalled();
  });
});
