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

import { DEFAULT_SETTINGS } from "../../settings/settings-schema";
import { settings, settingsLoadState } from "../../settings/settings-store";
import { mount, press, settle } from "../controls/preset-test-kit";
import { settingsTarget } from "../settings/settings-focus-store";
import { CommandSettings } from "./command-settings";
import { commandActiveKey, commandQuery, commandScope } from "./command-settings-state";

const scrolled: Element[] = [];

beforeEach(() => {
  settings.value = DEFAULT_SETTINGS;
  settingsLoadState.value = { status: "ready" };
  commandQuery.value = "";
  commandScope.value = null;
  commandActiveKey.value = null;
  settingsTarget.value = null;
  scrolled.length = 0;
  // jsdom has no layout, so it has no scrollIntoView either.
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const search = (): HTMLInputElement =>
  document.querySelector<HTMLInputElement>(
    'input[aria-label="Search settings"]',
  ) as HTMLInputElement;

async function typeInto(input: HTMLInputElement, text: string): Promise<void> {
  await act(async () => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    set?.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle();
}

async function open(onClose = vi.fn()) {
  const view = await mount(<CommandSettings open onClose={onClose} />);
  return { view, onClose };
}

const rowLabels = (): string[] =>
  [...document.querySelectorAll('[aria-label="Results"] li > button[id^="command-row-"]')].map(
    (row) => row.querySelector(".truncate")?.textContent ?? "",
  );

const activeRow = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[aria-label="Results"] [aria-current]');

const chip = (label: string): HTMLElement =>
  [...document.querySelectorAll<HTMLElement>('[data-slot="toggle-group-item"]')].find(
    (item) => item.textContent === label,
  ) as HTMLElement;

describe("Command Settings frame", () => {
  it("puts focus in the search field and offers every area as a chip", async () => {
    await open();
    expect(document.activeElement).toBe(search());
    const chips = [...document.querySelectorAll('[data-slot="toggle-group-item"]')].map(
      (item) => item.textContent,
    );
    expect(chips).toEqual([
      "Appearance",
      "Browser",
      "Terminal",
      "Agents",
      "Links & editor",
      "Shortcuts",
      "Notifications",
      "About",
      "Privacy",
      "Reset",
    ]);
  });

  it("renders nothing while closed", async () => {
    const view = await mount(<CommandSettings open={false} onClose={vi.fn()} />);
    expect(view.host.innerHTML).toBe("");
  });

  it("lists what changed on the home list, and Enter opens that row's area with the row revealed", async () => {
    settings.value = { ...DEFAULT_SETTINGS, scrollback: 1000 };
    await open();
    expect(rowLabels()).toContain("Scrollback");
    expect(activeRow()?.textContent).toContain("Scrollback");
    expect(activeRow()?.textContent).toContain("1k lines");
    expect(activeRow()?.textContent).toContain("Terminal");

    await press(search(), { key: "Enter" });

    expect(document.querySelector('[data-slot="badge"]')?.textContent).toBe("Terminal");
    const row = document.querySelector('[data-setting="scrollback"]');
    expect(row?.classList.contains("is-target")).toBe(true);
    expect(scrolled).toContain(row);
  });

  it("opens a row's area on a click and leaves typing where it was", async () => {
    settings.value = { ...DEFAULT_SETTINGS, scrollback: 1000 };
    await open();
    const row = document.querySelector<HTMLElement>(
      '[id="command-row-changed:setting:scrollback"]',
    );
    row?.focus();
    await act(async () => row?.click());
    await settle();
    expect(document.querySelector('[data-slot="badge"]')?.textContent).toBe("Terminal");
    // The row unmounted with the list; the search field took focus rather than the body.
    expect(document.activeElement).toBe(search());
  });

  it("closes with the Back button, the pointer's way out of a layer that covers the window", async () => {
    const { onClose } = await open();
    const back = [...document.querySelectorAll<HTMLElement>("button")].find(
      (button) => button.textContent === "Back",
    );
    await act(async () => back?.click());
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("narrows the list to what the text matches, grouped under its area", async () => {
    await open();
    await typeInto(search(), "scroll");
    const headings = [...document.querySelectorAll("h3")].map((heading) => heading.textContent);
    // The best hit's area leads; Shortcuts follows for its scrollback actions.
    expect(headings).toEqual(["Terminal", "Shortcuts"]);
    expect(rowLabels()[0]).toBe("Scrollback");
    expect(rowLabels()).not.toContain("Font size");

    await typeInto(search(), "zzzzzz");
    expect(document.body.textContent).toContain("Nothing matches");
    expect(rowLabels()).toEqual([]);
  });

  it("walks rows with the arrows and opens the highlighted one with Enter", async () => {
    await open();
    await typeInto(search(), "font");
    const labels = rowLabels();
    expect(labels.length).toBeGreaterThan(1);
    expect(activeRow()?.textContent).toContain(labels[0]);

    await press(search(), { key: "ArrowDown" });
    expect(activeRow()?.textContent).toContain(labels[1]);
    await press(search(), { key: "ArrowUp" });
    await press(search(), { key: "ArrowUp" });
    expect(activeRow()?.textContent).toContain(labels[0]);

    await press(search(), { key: "ArrowDown" });
    await press(search(), { key: "Enter" });
    expect(document.querySelector('[data-slot="badge"]')?.textContent).toBe("Appearance");
    expect(commandQuery.value).toBe("");
  });

  it("scopes to an area from its chip, mounts the section, and leaves with the badge button", async () => {
    await open();
    await act(async () => chip("Terminal").click());
    await settle();
    expect(document.querySelector('[data-slot="badge"]')?.textContent).toBe("Terminal");
    expect(document.querySelector('[data-setting="scrollback"]')).not.toBeNull();

    const leave = document.querySelector<HTMLElement>('button[aria-label="Leave Terminal"]');
    await act(async () => leave?.click());
    await settle();
    expect(document.querySelector('[data-slot="badge"]')).toBeNull();
    expect(document.querySelector('[data-setting="scrollback"]')).toBeNull();
  });

  it("returns focus to where it was once it closes with nothing else holding it", async () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    const view = await mount(<CommandSettings open onClose={vi.fn()} />);
    expect(document.activeElement).toBe(search());

    await view.update(<CommandSettings open={false} onClose={vi.fn()} />);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});

describe("Command Settings keyboard", () => {
  it("Escape clears the query, then leaves the area, then closes", async () => {
    commandScope.value = "terminal";
    const { onClose } = await open();
    await typeInto(search(), "scroll");

    await press(search(), { key: "Escape" });
    expect(commandQuery.value).toBe("");
    expect(commandScope.value).toBe("terminal");
    expect(onClose).not.toHaveBeenCalled();

    await press(search(), { key: "Escape" });
    expect(commandScope.value).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    await press(search(), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Backspace on an empty field leaves the area", async () => {
    commandScope.value = "terminal";
    await open();
    await press(search(), { key: "Backspace" });
    expect(commandScope.value).toBeNull();
  });

  it("leaves Escape to a terminal that owns focus", async () => {
    const { onClose } = await open();
    const term = document.createElement("div");
    term.className = "xterm";
    const area = document.createElement("textarea");
    term.appendChild(area);
    document.body.appendChild(term);
    area.focus();

    await press(area, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    term.remove();
  });

  it("leaves Escape to an open popup", async () => {
    commandScope.value = "terminal";
    const { onClose } = await open();
    const popup = document.createElement("div");
    popup.setAttribute("data-slot", "select-content");
    document.body.appendChild(popup);

    await press(search(), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(commandScope.value).toBe("terminal");
    popup.remove();
  });

  it("keeps an uncommitted draft's Escape for the field, and only then lets Escape through", async () => {
    commandScope.value = "browser";
    const { onClose } = await open();
    const field = document.querySelector<HTMLInputElement>(
      'input[aria-label="Browser home address"]',
    ) as HTMLInputElement;
    field.focus();
    await typeInto(field, "http://localhost:9999");

    // The draft is unsaved: Escape reverts it and goes no further.
    await press(field, { key: "Escape" });
    expect(field.value).toBe(DEFAULT_SETTINGS.browserHomeUrl);
    expect(commandScope.value).toBe("browser");
    expect(onClose).not.toHaveBeenCalled();

    // Clean now: Escape hands focus back to the search field rather than closing.
    await press(field, { key: "Escape" });
    expect(document.activeElement).toBe(search());
    expect(commandScope.value).toBe("browser");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("commits a typed value when Escape moves focus out of its field", async () => {
    commandScope.value = "browser";
    await open();
    const field = document.querySelector<HTMLInputElement>(
      'input[aria-label="Browser home address"]',
    ) as HTMLInputElement;
    field.focus();
    await typeInto(field, "http://localhost:4000");
    // Enter commits; the draft is now the saved value, so Escape is no longer claimed.
    await press(field, { key: "Enter" });
    await press(field, { key: "Escape" });
    expect(settings.value.browserHomeUrl).toBe("http://localhost:4000");
  });

  it("keeps Tab inside the surface, wrapping at both ends and pulling stray focus back in", async () => {
    await open();
    const root = document.querySelector('[role="dialog"]') as HTMLElement;
    const stops = [...root.querySelectorAll<HTMLElement>("input, button")].filter(
      (item) => item.tabIndex >= 0,
    );
    const first = stops[0];
    const last = stops[stops.length - 1];

    last.focus();
    await press(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    await press(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);

    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    await press(outside, { key: "Tab" });
    expect(root.contains(document.activeElement)).toBe(true);
    outside.remove();
  });
});

describe("Command Settings loading snapshot", () => {
  it("makes the list inert while the snapshot loads, but keeps the field and chips usable", async () => {
    settingsLoadState.value = { status: "loading" };
    commandScope.value = "terminal";
    await open();
    const list = document.querySelector('[aria-label="Results"] fieldset') as HTMLFieldSetElement;
    expect(list.disabled).toBe(true);
    expect(search().disabled).toBe(false);
    expect(chip("Browser").hasAttribute("disabled")).toBe(false);
    expect(document.querySelector('[aria-label="Results"]')?.getAttribute("aria-busy")).toBe(
      "true",
    );
  });

  it("shows a failed load with a retry", async () => {
    settingsLoadState.value = { status: "error", message: "Couldn't load settings." };
    await open();
    const alert = document.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Couldn't load settings.");
    expect(alert?.querySelector("button")?.textContent).toMatch(/retry/i);
  });
});
