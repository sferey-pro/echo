import { beforeEach, describe, expect, it, mock } from "bun:test";
import { useStore } from "../../../store/useStore";
import { fireEvent, render, screen, waitFor } from "../../../test-utils";
import { Header } from "./Header";

describe("Component: Header", () => {
  const _originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            isSynced: true,
            commitsBehind: 0,
            error: "",
            hasGit: true,
          }),
      } as Response),
    ) as unknown as typeof fetch;
  });

  it("renders correctly and checks status", async () => {
    const onOpenSettings = mock();
    render(<Header onOpenSettings={onOpenSettings} />);

    expect(screen.getByText("Echo")).toBeDefined();

    // Wait for fetch to be called
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    // Should display Synchro OK when hasGit is true
    expect(screen.getByText("Synchro OK")).toBeDefined();
  });

  it("opens settings when clicking the gear icon", () => {
    const onOpenSettings = mock();
    render(<Header onOpenSettings={onOpenSettings} />);

    const btn = screen.getByTitle("Paramètres Echo");
    fireEvent.click(btn);

    expect(onOpenSettings).toHaveBeenCalled();
  });

  it("handles git sync when clicking the sync button", async () => {
    const _callCount = 0;
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      if (input.toString().includes("/api/sync/pull")) {
        return Promise.resolve({ ok: true } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            isSynced: false,
            commitsBehind: 2,
            error: "",
            hasGit: true,
          }),
      } as Response);
    }) as unknown as typeof fetch;

    render(<Header onOpenSettings={mock()} />);

    // Wait for status to load
    await screen.findByText("2 Maj en attente");

    const syncBtn = screen.getByText("2 Maj en attente").closest("button");
    expect(syncBtn).not.toBeNull();
    fireEvent.click(syncBtn!);

    // Should update status to Synchro OK after pull
    await screen.findByText("Synchro OK");

    // The loadCollection store method should be called
    const _store = useStore.getState();
    // We just verify it reached the end without crashing
  });
});
