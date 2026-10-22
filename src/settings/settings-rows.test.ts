import { describe, expect, it } from "vitest";
import { SETTINGS_REGISTRY } from "./settings-registry";
import {
  agentEntryChanged,
  FONT_SIZE_STEPPER,
  SETTING_CONTROLS,
  scrollbackLabel,
  settingRow,
} from "./settings-rows";
import { DEFAULT_SETTINGS, SCROLLBACK_CHOICES, type Settings } from "./settings-schema";

describe("SETTING_CONTROLS", () => {
  it("gives a control to exactly the keys a Settings page shows", () => {
    for (const key of Object.keys(SETTINGS_REGISTRY) as (keyof Settings)[]) {
      expect(SETTING_CONTROLS[key].kind === "none", key).toBe(SETTINGS_REGISTRY[key].page === null);
    }
  });

  it("offers every scrollback size the schema allows, by its label", () => {
    const control = SETTING_CONTROLS.scrollback;
    expect(control.kind === "choice" ? control.choices : []).toEqual(
      SCROLLBACK_CHOICES.map((lines) => ({ value: lines, label: scrollbackLabel(lines) })),
    );
    expect(scrollbackLabel(10_000)).toBe("10k lines");
    expect(scrollbackLabel(500)).toBe("500 lines");
  });
});

describe("settingRow", () => {
  it("reads a preference's value, default, mark and reset target", () => {
    expect(settingRow("fontSize", { ...DEFAULT_SETTINGS, fontSize: 15 })).toEqual({
      key: "fontSize",
      label: "Font size",
      page: "appearance",
      control: FONT_SIZE_STEPPER,
      value: 15,
      fallback: 13,
      changed: true,
      resetKeys: ["fontSize"],
    });
    expect(settingRow("fontSize", DEFAULT_SETTINGS).changed).toBe(false);
  });

  it("gives data, layout and state keys no mark and no reset of their own", () => {
    const current: Settings = {
      ...DEFAULT_SETTINGS,
      customAgents: [{ id: "custom:aider", label: "Aider", command: "aider" }],
      sidebarWidth: 300,
      githubStarred: true,
    };
    for (const key of ["customAgents", "sidebarWidth", "githubStarred"] as const) {
      const row = settingRow(key, current);
      expect(row.value).not.toEqual(row.fallback);
      expect(row.changed, key).toBe(false);
      expect(row.resetKeys, key).toBeNull();
    }
  });
});

describe("agentEntryChanged", () => {
  it("marks only the agent whose own entry differs", () => {
    const current: Settings = { ...DEFAULT_SETTINGS, disabledAgents: ["codex"] };
    expect(agentEntryChanged("codex", current)).toBe(true);
    expect(agentEntryChanged("claude", current)).toBe(false);
  });
});
