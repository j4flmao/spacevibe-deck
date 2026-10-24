// @vitest-environment jsdom
import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The same host stubs `agent-rail.test.tsx` needs: the rail's import graph reaches the host.
vi.mock("../../host/store-host", () => ({
  Store: {
    load: vi.fn(async () => ({
      get: vi.fn(async () => undefined),
      set: vi.fn(async () => {}),
      save: vi.fn(async () => {}),
    })),
  },
}));
vi.mock("../../host/dialog-host", () => ({ open: vi.fn(async () => null) }));
vi.mock("../../host/bridge", () => ({ invoke: vi.fn(async () => null) }));
vi.mock("../../terminal/file-drop", () => ({
  installFileDrop: vi.fn(async () => () => {}),
}));
// Phosphor components are React `forwardRef` objects that jsdom cannot use as a tag.
vi.mock("../controls/deck-icon", () => ({
  CHROME_ICON: 13,
  ROW_ICON: 14,
  FEATURE_ICON: 15,
  DeckIcon: ({ size }: { readonly size: number }) => <span data-deck-icon-size={size} />,
}));

import { activeTabIndex, tabViews, type PaneView, type TabView } from "../../terminal/tabs-store";
import { AgentRail } from "../agent-rail";
import {
  configureRepositoryClient,
  invalidateRepositoryScans,
} from "../../repositories/repositories-store";
import type { RepositoryScan } from "../../repositories/repository-client";
import { initializeDesktopEnvironment, resetDesktopEnvironmentForTests } from "../../lib/platform";
import {
  createFileSurfaceController,
  type FileSurfaceController,
} from "../../files/file-surface-controller";
import { resetFileSurfaces } from "../../files/file-surface-store";
import type { FileClient } from "../../files/file-client";
import { workspacesData } from "../../open-board/workspaces-store";
import { WORKSPACES_VERSION } from "../../lib/workspace-recents";
import { sessionArchive } from "../../terminal/session-journal";
import { paneModels, paneTails } from "../../terminal/session-tail-store";
import { resetProjectRailState } from "./project-rail-state";

const fileClient: FileClient = {
  listDir: async () => [],
  readFile: async () => ({ kind: "refused", reason: "unused in this test" }),
  writeFile: async (_root, path) => ({ path, mtimeMs: 1, size: 1 }),
  statFiles: async (_root, paths) =>
    paths.map((path) => ({ path, exists: true, mtimeMs: 1, size: 1 })),
  watchPaths: async () => {},
  setDirtyFiles: async () => {},
  createEntry: async (_root: string, parent: string, name: string) => ({
    path: `${parent}/${name}`,
  }),
  listenFileChanged: async () => () => {},
};

const checkout = (path: string, branch: string) => ({
  path,
  head: "a",
  branch,
  bare: false,
  detached: false,
  locked: null,
  prunable: null,
});

const REPOSITORY: RepositoryScan = {
  kind: "repository",
  key: "/r/.git",
  root: "/r/main",
  worktrees: [checkout("/r/main", "main"), checkout("/r/side", "side")],
};

const MINUTE = 60_000;
const NOW = 1_800_000_000_000;

function pane(overrides: Partial<PaneView> = {}): PaneView {
  return {
    paneId: 11,
    agent: "claude",
    attention: "none",
    phase: "idle",
    hasRun: true,
    changedAt: NOW - 30 * MINUTE,
    ...overrides,
  };
}

function tab(overrides: Partial<TabView> = {}): TabView {
  return {
    key: 1,
    process: "node",
    name: null,
    dotColor: null,
    workspacePath: "/r/main",
    agents: [],
    agentBusy: false,
    unread: false,
    panes: [pane()],
    ...overrides,
  };
}

/** A repository that asks and works, a finished side checkout, a failed folder beside a shell. */
function workday(): TabView[] {
  return [
    tab({
      key: 1,
      panes: [
        pane({ paneId: 11, attention: "requested", changedAt: NOW - 10 * MINUTE }),
        pane({ paneId: 12, agent: "codex", phase: "working", changedAt: NOW - MINUTE }),
      ],
    }),
    tab({
      key: 2,
      workspacePath: "/r/side",
      name: "token refresh",
      panes: [
        pane({
          paneId: 21,
          attention: "completed",
          confidence: "inferred",
          changedAt: NOW - 3 * MINUTE,
        }),
      ],
    }),
    tab({
      key: 3,
      workspacePath: "/w/api",
      panes: [pane({ paneId: 31, attention: "error", changedAt: NOW - 40 * MINUTE })],
    }),
    tab({ key: 4, workspacePath: "/w/api", panes: [] }),
  ];
}

/** The workday with the window's keyboard in tab `key` (the caller makes it the active tab). */
function workdayFocusing(key: number): TabView[] {
  return workday().map((view) =>
    view.key === key
      ? { ...view, panes: (view.panes ?? []).map((p) => ({ ...p, focused: true })) }
      : view,
  );
}

let host: HTMLDivElement;
let fileController: FileSurfaceController;

const NOOP = (): void => {};

/** Pin the host the way `action-availability.test.ts` does; the switch follows `isDevelopment`. */
function pinHost(isDevelopment: boolean): void {
  vi.stubGlobal("__deckHost", {});
  initializeDesktopEnvironment({ platform: "macos", homeDir: "/home/test", isDevelopment });
}

function mount(props: Partial<Parameters<typeof AgentRail>[0]> = {}): void {
  act(() => {
    render(
      <AgentRail
        onSelectTab={NOOP}
        onCloseTab={NOOP}
        onClosePane={NOOP}
        onFocusPane={NOOP}
        legacy={{ onOpenWorkspace: NOOP, onResumeWorktree: NOOP }}
        fileController={fileController}
        {...props}
      />,
      host,
    );
  });
}

function unmount(): void {
  act(() => render(null, host));
}

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function click(element: Element | null | undefined): void {
  act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

/** Dispatch a key on `element`; returns whether a handler cancelled it. */
function press(
  element: Element | null | undefined,
  key: string,
  modifiers: KeyboardEventInit = {},
): boolean {
  let event: KeyboardEvent | undefined;
  act(() => {
    event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...modifiers });
    element?.dispatchEvent(event);
  });
  return event?.defaultPrevented ?? false;
}

const rows = () => [...host.querySelectorAll<HTMLElement>("[data-rail-row]")];
const headers = () => [...host.querySelectorAll<HTMLElement>("[data-rail-project]")];
const row = (id: string) => host.querySelector<HTMLElement>(`[data-rail-row="${id}"]`);
const names = () => headers().map((header) => header.querySelector(".truncate")?.textContent);
const text = (element: Element | null | undefined) => element?.textContent ?? "";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
  host = document.createElement("div");
  document.body.appendChild(host);
  invalidateRepositoryScans();
  configureRepositoryClient({
    scan: async (path: string) =>
      path.startsWith("/r/") ? REPOSITORY : { kind: "plain", reason: "not a git repository" },
  });
  workspacesData.value = {
    version: WORKSPACES_VERSION,
    recents: [
      { path: "/r/main", lastOpenedAt: 4 },
      { path: "/w/api", lastOpenedAt: 3 },
      { path: "/w/notes", lastOpenedAt: 2 },
    ],
  };
  tabViews.value = workday();
  activeTabIndex.value = 0;
  resetFileSurfaces();
  fileController = createFileSurfaceController({ client: fileClient });
  sessionArchive.value = {};
  paneTails.value = new Map();
  paneModels.value = new Map();
  resetProjectRailState();
});

afterEach(() => {
  unmount();
  host.remove();
  invalidateRepositoryScans();
  resetDesktopEnvironmentForTests();
  workspacesData.value = { version: WORKSPACES_VERSION, recents: [] };
  fileController.dispose();
  resetFileSurfaces();
  sessionArchive.value = {};
  paneTails.value = new Map();
  paneModels.value = new Map();
  resetProjectRailState();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("AgentRail behind the projectRail switch", () => {
  it("keeps the shipped cluster list while the switch is off", async () => {
    pinHost(false);
    mount();
    await settle();

    expect(host.querySelectorAll(".asr-cluster").length).toBeGreaterThan(0);
    expect(rows()).toHaveLength(0);
  });

  it("replaces only the cluster list when the switch is on", async () => {
    pinHost(true);
    mount({ footer: <div data-testid="footer" /> });
    await settle();

    expect(host.querySelector(".asr-cluster")).toBeNull();
    expect(rows()).toHaveLength(5);
    // The create row above, the footer below and the nav that places them are still the old ones.
    expect(host.querySelector("nav.asr-rail--mounted")).not.toBeNull();
    expect(host.querySelector(".rail-create")).not.toBeNull();
    expect(host.querySelector("[data-testid=footer]")).not.toBeNull();
  });

  it("leaves the collapsed avatar column alone when the switch is on", async () => {
    pinHost(true);
    mount({ collapsed: true });
    await settle();

    expect(rows()).toHaveLength(0);
    expect(host.querySelector(".asr-cluster")).toBeNull();
  });

  it("raises the same callback with the same arguments as the shipped rows", async () => {
    // Shipped rows are found by what they open; the new list orders them its own way.
    const oldRow = (id: string) =>
      id.startsWith("shell")
        ? host.querySelector('.asr-card__row[data-kind="shell"] .asr-card__hit')
        : host.querySelector(`.asr-card__row[data-pane-id="${id.slice(5)}"] .asr-card__hit`);
    const ids = ["pane:11", "pane:12", "pane:21", "pane:31", "shell:4"];
    const pressed = async (development: boolean, find: (id: string) => Element | null) => {
      pinHost(development);
      const onFocusPane = vi.fn();
      const onSelectTab = vi.fn();
      mount({ onFocusPane, onSelectTab });
      await settle();
      const calls = ids.map((id) => {
        onFocusPane.mockClear();
        onSelectTab.mockClear();
        click(find(id));
        return [onFocusPane.mock.calls, onSelectTab.mock.calls];
      });
      unmount();
      resetDesktopEnvironmentForTests();
      return calls;
    };

    const shipped = await pressed(false, oldRow);
    const projectFirst = await pressed(true, row);

    expect(projectFirst).toEqual(shipped);
    expect(shipped[0]).toEqual([[[0, 11]], []]);
    expect(shipped[4]).toEqual([[], [[3]]]);
  });
});

describe("project list", () => {
  beforeEach(() => {
    pinHost(true);
  });

  it("lists every project once, in the order the rail builds them, remembered ones last", async () => {
    mount();
    await settle();

    expect(names()).toEqual(["main", "api", "notes"]);
    expect(
      host.querySelector("section[aria-label=main]")?.querySelectorAll("[data-rail-row]"),
    ).toHaveLength(3);
  });

  it("orders a project's rows newest first, across its checkouts", async () => {
    mount();
    await settle();

    const main = host.querySelector("section[aria-label=main]");
    expect(
      [...(main?.querySelectorAll("[data-rail-row]") ?? [])].map((r) =>
        r.getAttribute("data-rail-row"),
      ),
    ).toEqual(["pane:12", "pane:21", "pane:11"]);
  });

  it("folds a project over its rows and unfolds it again", async () => {
    mount();
    await settle();

    const [main] = headers();
    expect(main.getAttribute("aria-expanded")).toBe("true");
    click(main);
    expect(headers()[0].getAttribute("aria-expanded")).toBe("false");
    expect(rows().map((r) => r.dataset.railRow)).toEqual(["pane:31", "shell:4"]);
    click(headers()[0]);
    expect(rows()).toHaveLength(5);
  });

  it("speaks for a folded project with its loudest agent and its count", async () => {
    mount();
    await settle();

    click(headers()[0]);
    // needs-input outranks working and unread in this project.
    const folded = headers()[0];
    expect(folded.querySelector('[data-state="needs-input"]')).not.toBeNull();
    expect(folded.querySelector('[data-state="working"]')).toBeNull();
    expect(text(folded)).toContain("3 sessions, needs you");

    // failed outranks everything, and a shell beside it adds to the count only.
    click(headers()[1]);
    const api = headers()[1];
    expect(api.querySelector('[data-state="failed"]')).not.toBeNull();
    expect(text(api)).toContain("2 sessions, failed");
  });

  it("shows no mark on a folded project nobody is loud in", async () => {
    tabViews.value = [tab({ panes: [pane({ paneId: 11 }), pane({ paneId: 12, hasRun: false })] })];
    mount();
    await settle();

    click(headers()[0]);
    expect(headers()[0].querySelector("[data-state]")).toBeNull();
    expect(text(headers()[0])).toContain("2 sessions");
  });

  it("keeps a remembered project's header with no rows under it", async () => {
    mount();
    await settle();

    const notes = host.querySelector("section[aria-label=notes]");
    expect(notes?.querySelectorAll("[data-rail-row]")).toHaveLength(0);
    expect(text(notes)).toContain("No sessions");
    expect(text(notes)).toContain("0 sessions");
  });

  it("says so when there is nothing to list", async () => {
    tabViews.value = [];
    workspacesData.value = { version: WORKSPACES_VERSION, recents: [] };
    mount();
    await settle();

    expect(headers()).toHaveLength(0);
    expect(text(host.querySelector("section[aria-label='Open agents']"))).toBe("Nothing here");
  });
});

describe("row", () => {
  beforeEach(() => {
    pinHost(true);
  });

  it("shows the title, agent, branch and time in state", async () => {
    mount();
    await settle();

    const named = row("pane:21");
    expect(text(named)).toContain("token refresh");
    expect(text(named)).toContain("side");
    expect(text(named)).toContain("3m");
    // The words behind the marks reach the accessible name, inferred ones qualified.
    expect(text(named)).toContain("unread (inferred)");
    expect(text(row("pane:12"))).toContain("Codex, working");
    expect(text(row("pane:12"))).toContain("main");
    expect(text(row("pane:12"))).toContain("1m");
    expect(row("pane:21")?.querySelector('[data-state="unread"]')).not.toBeNull();
  });

  it("names the folder where git knows no branch, and draws a shell row without an agent", async () => {
    mount();
    await settle();

    const failed = row("pane:31");
    expect(text(failed)).toContain("api");
    expect(failed?.querySelector('[data-state="failed"]')).not.toBeNull();
    const shell = row("shell:4");
    expect(text(shell)).toContain("shell, idle");
    expect(shell?.querySelector('[data-state="idle"]')).not.toBeNull();
  });

  it("highlights the row that holds the keyboard and no other", async () => {
    tabViews.value = workdayFocusing(2);
    activeTabIndex.value = 1;
    mount();
    await settle();

    expect(rows().filter((r) => r.getAttribute("aria-current") === "true")).toEqual([
      row("pane:21"),
    ]);
  });

  it("keeps the time in state current as the clock ticks, and still while the window is hidden", async () => {
    tabViews.value = [tab({ panes: [pane({ paneId: 11, changedAt: NOW - 4 * MINUTE - 30_000 })] })];
    mount();
    await settle();
    expect(text(row("pane:11"))).toContain("4m");

    act(() => {
      vi.advanceTimersByTime(MINUTE);
    });
    expect(text(row("pane:11"))).toContain("5m");

    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => {
      vi.advanceTimersByTime(10 * MINUTE);
    });
    expect(text(row("pane:11"))).toContain("5m");
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    await settle();
    expect(text(row("pane:11"))).toContain("15m");
  });

  it("stops the clock when the rail unmounts", async () => {
    mount();
    await settle();
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("keyboard", () => {
  beforeEach(() => {
    pinHost(true);
  });

  it("gives Tab one row to land on: the focused row, else the first", async () => {
    mount();
    await settle();
    expect(
      rows()
        .filter((r) => r.tabIndex === 0)
        .map((r) => r.dataset.railRow),
    ).toEqual(["pane:12"]);

    unmount();
    tabViews.value = workdayFocusing(3);
    activeTabIndex.value = 2;
    mount();
    await settle();
    expect(
      rows()
        .filter((r) => r.tabIndex === 0)
        .map((r) => r.dataset.railRow),
    ).toEqual(["pane:31"]);
  });

  it("walks headers and rows with the arrow keys and stops at the ends", async () => {
    mount();
    await settle();
    const stops = [...host.querySelectorAll<HTMLElement>("[data-rail-project],[data-rail-row]")];

    stops[0].focus();
    expect(press(stops[0], "ArrowDown")).toBe(true);
    expect(document.activeElement).toBe(stops[1]);
    expect(press(stops[1], "ArrowUp")).toBe(true);
    expect(document.activeElement).toBe(stops[0]);
    // Past the first stop the key is left to the list's own scrolling.
    expect(press(stops[0], "ArrowUp")).toBe(false);
    expect(document.activeElement).toBe(stops[0]);
    const last = stops[stops.length - 1];
    last.focus();
    expect(press(last, "ArrowDown")).toBe(false);
    expect(document.activeElement).toBe(last);
  });

  it("skips the rows of a folded project", async () => {
    mount();
    await settle();
    click(headers()[0]);
    const folded = headers()[0];
    folded.focus();

    press(folded, "ArrowDown");

    expect(document.activeElement).toBe(headers()[1]);
  });

  it("selects the focused row once on Enter, exactly as a press does", async () => {
    const onFocusPane = vi.fn();
    const onSelectTab = vi.fn();
    mount({ onFocusPane, onSelectTab });
    await settle();

    const target = row("pane:21");
    target?.focus();
    expect(press(target, "Enter")).toBe(true);
    expect(onFocusPane).toHaveBeenCalledExactlyOnceWith(1, 21);

    const shell = row("shell:4");
    press(shell, "Enter");
    expect(onSelectTab).toHaveBeenCalledExactlyOnceWith(3);
  });

  it.each([
    ["ArrowDown", { metaKey: true }],
    ["ArrowUp", { metaKey: true, altKey: true }],
    ["ArrowDown", { ctrlKey: true, shiftKey: true }],
    ["Enter", { metaKey: true, shiftKey: true }],
  ] as const)("leaves the chord %s with %o to the keymap", async (key, modifiers) => {
    const onFocusPane = vi.fn();
    mount({ onFocusPane });
    await settle();
    const target = row("pane:12");
    target?.focus();

    expect(press(target, key, modifiers)).toBe(false);
    expect(document.activeElement).toBe(target);
    expect(onFocusPane).not.toHaveBeenCalled();
  });

  it("leaves Enter on a project header to fold it, and ignores other keys", async () => {
    const onFocusPane = vi.fn();
    mount({ onFocusPane });
    await settle();

    expect(press(headers()[0], "Enter")).toBe(false);
    expect(press(row("pane:12"), "a")).toBe(false);
    expect(onFocusPane).not.toHaveBeenCalled();
  });
});
