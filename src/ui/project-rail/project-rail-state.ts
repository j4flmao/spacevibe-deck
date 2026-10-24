/**
 * The project-first rail's window state (R5: signals, window-scoped). Session-only by
 * owner decision F2 (`rail-view-state.ts`): no settings key, no journal, no IPC.
 *
 * Three pieces: the `RailViewState` the view model reads, the set of folded projects (a
 * fold is the rail's own, so `RailViewState` carries no field for it), and the coarse
 * clock the rows' time-in-state reads.
 */
import { signal } from "@preact/signals";
import {
  INITIAL_RAIL_VIEW_STATE,
  setArchived,
  togglePinned,
  type RailViewState,
} from "../rail-view-state";

export const railViewState = signal<RailViewState>(INITIAL_RAIL_VIEW_STATE);

export function togglePin(id: string): void {
  railViewState.value = togglePinned(railViewState.value, id);
}

/** Archived rows are drawn nowhere until the Archived section lands. */
export function archiveItem(id: string): void {
  railViewState.value = setArchived(railViewState.value, id, true);
}

/** `RailGroup.key`s. A new Set per change (C1), so the signal notifies. */
export const foldedProjects = signal<ReadonlySet<string>>(new Set());

export function toggleProjectFolded(key: string): void {
  const next = new Set(foldedProjects.value);
  if (!next.delete(key)) {
    next.add(key);
  }
  foldedProjects.value = next;
}

/** The label reads "5m", so a minute is the finest step worth waking a row for. */
const CLOCK_TICK_MS = 60_000;

/** Only the rows' time label reads it; the rail's view is never rebuilt on a tick. */
export const railNow = signal(Date.now());

/**
 * Keeps `railNow` moving while the rail is mounted. It stands still while the window is
 * hidden (U5: nothing repaints while idle) and catches up the moment it shows again.
 * Returns the stop function.
 */
export function runRailClock(): () => void {
  const tick = (): void => {
    if (!document.hidden) {
      railNow.value = Date.now();
    }
  };
  tick();
  const timer = window.setInterval(tick, CLOCK_TICK_MS);
  document.addEventListener("visibilitychange", tick);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", tick);
  };
}

/** Module signals outlive a test; the suites call this between cases. */
export function resetProjectRailState(): void {
  railViewState.value = INITIAL_RAIL_VIEW_STATE;
  foldedProjects.value = new Set();
  railNow.value = Date.now();
}
