// @vitest-environment jsdom
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The sections an area mounts pull in host-backed stores; stub them so the tree mounts in jsdom.
vi.mock("../../host/store-host", () => ({
  Store: {
    load: vi.fn(async () => ({
      get: vi.fn(async () => undefined),
      set: vi.fn(async () => {}),
      save: vi.fn(async () => {}),
      loadState: { state: "ready", fresh: false },
    })),
  },
}));
vi.mock("../../host/dialog-host", () => ({
  open: vi.fn(async () => null),
  ask: vi.fn(async () => true),
}));
vi.mock("../../lib/native-notification", () => ({
  requestAgentNotificationPermission: vi.fn(),
}));
vi.mock("../../chrome/events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../chrome/events")>();
  return { ...actual, reportPersistError: vi.fn() };
});

import { settingsOpen } from "../../chrome/events";
import { initializeDesktopEnvironment, resetDesktopEnvironmentForTests } from "../../lib/platform";
import { DEFAULT_SETTINGS } from "../../settings/settings-schema";
import { settings, settingsLoadState } from "../../settings/settings-store";
import { mount, press, settle } from "../controls/preset-test-kit";
import { activeCategory } from "../settings/active-category-store";
import { openSettingsAt, settingsTarget } from "../settings/settings-focus-store";
import { commandActiveKey, commandQuery, commandScope } from "./command-settings-state";
import { SettingsSurface } from "./settings-surface";

/** What `app.tsx` mounts: the surface fed by the shared `settingsOpen` signal. */
function Entrance() {
  return (
    <SettingsSurface
      open={settingsOpen.value}
      onClose={() => {
        settingsOpen.value = false;
      }}
    />
  );
}

/** The host identity the real entrance reads its switch from (`action-availability.test.ts`). */
function pinHost(isDevelopment: boolean): void {
  vi.stubGlobal("__deckHost", {});
  initializeDesktopEnvironment({ platform: "macos", homeDir: "/home/test", isDevelopment });
}

beforeEach(() => {
  settings.value = DEFAULT_SETTINGS;
  settingsLoadState.value = { status: "ready" };
  settingsOpen.value = false;
  activeCategory.value = "appearance";
  commandQuery.value = "";
  commandScope.value = null;
  commandActiveKey.value = null;
  settingsTarget.value = null;
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetDesktopEnvironmentForTests();
});

const dialog = (): HTMLElement | null => document.querySelector('section[role="dialog"]');
const badge = (): string | undefined =>
  document.querySelector('[data-slot="badge"]')?.textContent ?? undefined;

async function openAt(...args: Parameters<typeof openSettingsAt>): Promise<void> {
  await act(async () => openSettingsAt(...args));
  await settle();
}

describe("Settings entrance with the commandSettings switch off", () => {
  it.each([
    ["no host (a unit test)", false],
    ["a packaged host", true],
  ])("keeps the Settings screen with %s", async (_label, pinned) => {
    if (pinned) pinHost(false);
    await mount(<Entrance />);
    await openAt("shortcuts");
    expect(document.querySelector(".settings-screen.is-open")).not.toBeNull();
    expect(dialog()).toBeNull();
  });
});

describe("Settings entrance with the commandSettings switch on", () => {
  beforeEach(() => pinHost(true));

  it("shows Command Settings in place of the screen", async () => {
    await mount(<Entrance />);
    await openAt("shortcuts");
    expect(dialog()).not.toBeNull();
    expect(document.querySelector(".settings-screen")).toBeNull();
  });

  it("scopes to the page's area and mounts its section when no row is named", async () => {
    await mount(<Entrance />);
    await openAt("shortcuts");
    expect(badge()).toBe("Shortcuts");
    expect(document.querySelector('section[aria-label="Shortcuts"]')).not.toBeNull();
  });

  it("scopes to the area and reveals the named row", async () => {
    const scrolled: Element[] = [];
    Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
      scrolled.push(this);
    });
    await mount(<Entrance />);
    await openAt("terminal", "scrollback");
    expect(badge()).toBe("Terminal");
    const row = document.querySelector('[data-setting="scrollback"]');
    expect(row?.classList.contains("is-target")).toBe(true);
    expect(scrolled).toContain(row);
  });

  it("degrades a key with no row of its own to its area's section", async () => {
    await mount(<Entrance />);
    await openAt("shortcuts", "keybindings");
    expect(badge()).toBe("Shortcuts");
    expect(document.querySelector('section[aria-label="Shortcuts"]')).not.toBeNull();
  });

  it("follows a second deep link while it is already open", async () => {
    await mount(<Entrance />);
    await openAt("terminal", "scrollback");
    await openAt("agents");
    expect(badge()).toBe("Agents");
    expect(document.querySelector('[data-setting="scrollback"]')).toBeNull();
  });

  async function setOpen(value: boolean): Promise<void> {
    await act(async () => {
      settingsOpen.value = value;
    });
    await settle();
  }

  it("opens unscoped from the chord, which names no page", async () => {
    await mount(<Entrance />);
    await setOpen(true);
    expect(dialog()).not.toBeNull();
    expect(badge()).toBeUndefined();
  });

  it("reopens in the last area, as the screen reopens on its last category", async () => {
    await mount(<Entrance />);
    await openAt("terminal");
    await setOpen(false);
    expect(dialog()).toBeNull();
    await setOpen(true);
    expect(badge()).toBe("Terminal");
  });

  it("forgets a revealed row when it closes, so the next visit to the area is plain", async () => {
    await mount(<Entrance />);
    await openAt("terminal", "scrollback");
    expect(settingsTarget.value).toBe("scrollback");
    await setOpen(false);
    expect(settingsTarget.value).toBeNull();
    await setOpen(true);
    expect(document.querySelector('[data-setting="scrollback"]')?.className).not.toContain(
      "is-target",
    );
  });

  it("closes through the callback when Escape has nothing left to clear", async () => {
    await mount(<Entrance />);
    await setOpen(true);
    await press(document.querySelector('input[aria-label="Search settings"]') as Element, {
      key: "Escape",
    });
    expect(settingsOpen.value).toBe(false);
  });
});
