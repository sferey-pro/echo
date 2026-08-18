import { beforeEach, describe, expect, it, mock } from "bun:test";
// Setup happy-dom globally for React components in Bun
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { fireEvent, render, screen } from "@testing-library/react";
import { useStore } from "../../store/useStore";
import { RequestList } from "./RequestList";

try {
  GlobalRegistrator.register();
} catch (_e) {
  /* already registered */
}

mock.module("@tanstack/react-virtual", () => ({
  // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
  useVirtualizer: (options: any) => {
    return {
      getVirtualItems: () => {
        return Array.from({ length: options.count }).map((_, i) => ({
          index: i,
          key: i,
          size: 28,
          start: i * 28,
        }));
      },
      getTotalSize: () => options.count * 28,
    };
  },
}));

describe("Component: RequestList", () => {
  beforeEach(() => {
    useStore.setState({
      folders: [],
      requests: [],
      selectedFolderId: null,
      selectedRequestId: null,
    });
  });

  it("renders correctly when no folders and requests", () => {
    render(
      <RequestList onOpenSettings={() => {}} onOpenCollections={() => {}} />,
    );
    expect(screen.getByText(/Explorateur/i)).toBeDefined();
  });

  it("renders requests and folders correctly", () => {
    useStore.setState({
      folders: [],
      requests: [
        {
          id: "req1",
          folderId: "root",
          name: "Get Users",
          method: "GET",
          url: "/users",
          examples: [],
        },
      ],
    });

    render(
      <RequestList onOpenSettings={() => {}} onOpenCollections={() => {}} />,
    );
    expect(screen.getAllByText("Get Users")[0]).toBeDefined();
    expect(screen.getAllByText("GET")[0]).toBeDefined();
  });

  it("renders starred requests and toggle folders", async () => {
    useStore.setState({
      folders: [{ id: "f1", name: "Folder1", children: [] }],
      requests: [
        {
          id: "req1",
          folderId: "f1",
          name: "Get Users",
          method: "GET",
          url: "/users",
          examples: [],
          isStarred: true,
          // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
          variants: [{ id: "v1", name: "Var1", isMocked: true } as any],
        },
        {
          id: "req2",
          folderId: "f1",
          name: "Obsolete Req",
          method: "POST",
          url: "/post",
          examples: [],
          isObsolete: true,
        },
      ],
    });

    // biome-ignore lint/correctness/noUnusedVariables: Exception (API match) - Variable required for specific function signatures
    const { container } = render(
      <RequestList onOpenSettings={() => {}} onOpenCollections={() => {}} />,
    );

    // Test starred header toggle
    const starredHeader = screen.getByText("Mes Favoris");
    expect(starredHeader).toBeDefined();
    fireEvent.click(starredHeader);

    // Test folder toggle
    const folder = screen.getByText("Folder1");
    expect(folder).toBeDefined();
    fireEvent.click(folder);

    // Now the requests inside folder and starred should be visible
    expect(screen.getAllByText("Get Users")[0]).toBeDefined();
    expect(screen.getByText("Obsolete Req")).toBeDefined();
    expect(screen.getAllByText("Var1 (default)")[0]).toBeDefined();
  });
});
