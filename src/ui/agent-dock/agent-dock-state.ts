/**
 * Window-scoped state of the stacked dock (R5): which sections are unfolded, and whether the
 * narrow-window sheet is open. Module-level so folding survives focus moving between agents, and
 * so `App` can read the sheet flag for `browserPanelObscured`.
 */
import { signal } from "@preact/signals";
import type { DockTab } from "../../settings/settings-schema";

export type DockSectionId = "changes" | "files" | "usage" | "history";

/**
 * What a fresh window shows (the mock's own defaults): the checkout's Changes, the thing an agent's
 * work leaves behind. Usage polls while it is unfolded, so it waits for a press.
 */
const DEFAULT_OPEN: Readonly<Record<DockSectionId, boolean>> = {
  changes: true,
  files: false,
  usage: false,
  history: false,
};

/** The section each legacy dock tab (and its chord) names. */
export const SECTION_OF_TAB: Readonly<Record<DockTab, DockSectionId>> = {
  explorer: "files",
  usage: "usage",
  sessions: "history",
};

export const dockSectionsOpen = signal<Readonly<Record<DockSectionId, boolean>>>(DEFAULT_OPEN);

export function setDockSectionOpen(id: DockSectionId, open: boolean): void {
  dockSectionsOpen.value = { ...dockSectionsOpen.value, [id]: open };
}

/**
 * The narrow-window sheet. The native browser view paints above every DOM layer, so `App` yields
 * it while this is true; the host resets it when it unmounts or the window widens.
 */
export const dockSheetOpen = signal(false);

export function resetAgentDockState(): void {
  dockSectionsOpen.value = DEFAULT_OPEN;
  dockSheetOpen.value = false;
}
