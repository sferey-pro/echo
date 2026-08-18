import { beforeEach, describe, expect, it } from "bun:test";
import { useStore } from "./useStore";

describe("Zustand Store: useStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useStore.setState({
      folders: [],
      requests: [],
      environments: [],
      selectedRequestId: null,
      selectedFolderId: null,
      selectedScenarioId: null,
      activeEnvironment: "",
      isLoading: false,
      isError: false,
      errorMessage: null,
    });
  });

  it("should set selected request id", () => {
    const { setSelectedRequestId } = useStore.getState();
    setSelectedRequestId("req-123");

    expect(useStore.getState().selectedRequestId).toBe("req-123");
  });

  it("should set folders and requests", () => {
    const { setFolders, setRequests } = useStore.getState();
    setFolders([{ id: "f1", name: "Folder 1" }]);
    setRequests([
      {
        id: "r1",
        folderId: "f1",
        name: "Req 1",
        method: "GET",
        url: "/",
        examples: [],
      },
    ]);

    expect(useStore.getState().folders.length).toBe(1);
    expect(useStore.getState().requests.length).toBe(1);
  });

  it("should update local variant correctly", () => {
    const { setRequests, updateLocalVariant } = useStore.getState();

    // Setup initial state
    setRequests([
      {
        id: "r1",
        folderId: "f1",
        name: "Req 1",
        method: "GET",
        url: "/",
        examples: [],
        variants: [
          {
            id: "v1",
            name: "V1",
            isMocked: false,
            statusCode: 200,
            latencyMs: 0,
            payload: "",
            selectedExample: null,
            pathParamsOverrides: {},
          },
        ],
      },
    ]);

    // Update variant
    updateLocalVariant("r1", "v1", { isMocked: true, statusCode: 404 });

    const reqs = useStore.getState().requests;
    expect(reqs[0]?.variants?.[0]?.isMocked).toBe(true);
    expect(reqs[0]?.variants?.[0]?.statusCode).toBe(404);
  });
});
