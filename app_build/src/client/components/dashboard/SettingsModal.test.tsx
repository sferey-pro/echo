import { describe, expect, it, mock } from "bun:test";
import * as api from "../../lib/api";
import { fireEvent, render, screen } from "../../test-utils";
import { SettingsModal } from "./SettingsModal";

mock.module("../../lib/api", () => ({
  getSettings: mock(() =>
    Promise.resolve({ TARGET_API_URL: "http://localhost:3000" }),
  ),
  updateSetting: mock(() => Promise.resolve()),
  resetApplication: mock(() => Promise.resolve()),
}));

describe("Component: SettingsModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: mock(),
    onSaved: mock(),
  };

  it("renders correctly when open and loads settings", async () => {
    render(<SettingsModal {...defaultProps} />);

    // Wait for settings to load
    const input = await screen.findByDisplayValue("http://localhost:3000");
    expect(input).toBeDefined();
    expect(screen.getByText("Paramètres de l'Application Echo")).toBeDefined();
  });

  it("calls updateSetting on save", async () => {
    const onSaved = mock();
    const onClose = mock();

    render(<SettingsModal isOpen={true} onClose={onClose} onSaved={onSaved} />);

    const input = await screen.findByDisplayValue("http://localhost:3000");
    fireEvent.change(input, { target: { value: "http://localhost:4000" } });

    const saveBtn = screen.getByText("Enregistrer");
    fireEvent.click(saveBtn);

    // updateSetting should be called
    expect(api.updateSetting).toHaveBeenCalledWith(
      "TARGET_API_URL",
      "http://localhost:4000",
    );
  });
});
