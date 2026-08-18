import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { useStore } from "./store/useStore";

try {
  GlobalRegistrator.register();
  // Polyfills for Radix UI in Happy DOM
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  globalThis.DOMRect = class DOMRect {
    bottom = 0;
    left = 0;
    right = 0;
    top = 0;
    constructor(
      public x = 0,
      public y = 0,
      public width = 0,
      public height = 0,
    ) {}
    static fromRect(other?: DOMRectInit): DOMRect {
      return new DOMRect(other?.x, other?.y, other?.width, other?.height);
    }
    toJSON() {
      return JSON.stringify(this);
    }
  };
  if (typeof window.PointerEvent === "undefined") {
    class PointerEvent extends MouseEvent {
      pointerId: number;
      width: number;
      height: number;
      pressure: number;
      tangentialPressure: number;
      tiltX: number;
      tiltY: number;
      twist: number;
      pointerType: string;
      isPrimary: boolean;

      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 1;
        this.width = params.width ?? 1;
        this.height = params.height ?? 1;
        this.pressure = params.pressure ?? 0;
        this.tangentialPressure = params.tangentialPressure ?? 0;
        this.tiltX = params.tiltX ?? 0;
        this.tiltY = params.tiltY ?? 0;
        this.twist = params.twist ?? 0;
        this.pointerType = params.pointerType ?? "";
        this.isPrimary = params.isPrimary ?? false;
      }
    }
    (window as any).PointerEvent = PointerEvent;
  }
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false;
    HTMLElement.prototype.setPointerCapture = () => {};
    HTMLElement.prototype.releasePointerCapture = () => {};
  }
} catch (_e) {
  /* already registered */
}

afterEach(() => {
  cleanup();
});

export function resetStore() {
  useStore.setState({
    folders: [],
    requests: [],
    environments: [],
    selectedRequestId: null,
    selectedFolderId: null,
    selectedScenarioId: null,
    activeEnvironment: "",
    isLoading: true,
    isError: false,
    errorMessage: null,
  });
}

export function renderWithProviders(ui: ReactElement) {
  return render(ui);
}

export * from "@testing-library/react";
export { renderWithProviders as render };
