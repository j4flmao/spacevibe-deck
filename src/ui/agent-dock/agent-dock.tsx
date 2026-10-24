import { useEffect } from "preact/hooks";
import { shortcutLabel } from "../../lib/shortcut-label";
import { dockNarrow } from "./agent-dock-layout";
import { dockSheetOpen } from "./agent-dock-state";
import { DockColumn, type DockBodies } from "./dock-column";
import { DockEdge } from "./dock-edge";
import { useFocusedRailItem } from "./use-focused-rail-item";
import { useRevealDockTab } from "./use-reveal-dock-tab";

export interface AgentDockProps {
  /** Whether the column is at rest on screen; `useDockPresence` owns it, as for the legacy dock. */
  readonly entered: boolean;
  /** Hides the dock. `App` routes it into the `toggle-dock` action and its focus guard. */
  readonly onClose: () => void;
  readonly bodies: DockBodies;
}

/**
 * The stacked-section dock (spec LAY-6, LAY-9): a fixed 320px column of collapsible sections, or
 * under 1360px a 32px edge handle that opens the same column as a sheet. It rides the legacy
 * `.dock-panel` box, so the stage inset, the slide-over and the usage page's `inert` cover keep
 * working, and `27-dock-stacked.css` repaints it on the rail's surface.
 */
export function AgentDock({ entered, onClose, bodies }: AgentDockProps) {
  const narrow = dockNarrow.value;
  const item = useFocusedRailItem();
  useRevealDockTab();
  // The browser yields while the sheet is open, so a stale flag would hide it for good.
  useEffect(() => {
    if (!narrow) {
      dockSheetOpen.value = false;
    }
  }, [narrow]);
  useEffect(
    () => () => {
      dockSheetOpen.value = false;
    },
    [],
  );
  return (
    <aside
      className={`dock-panel agent-dock ui-preset${entered ? " is-open" : ""}`}
      aria-label="Agent dock"
    >
      {narrow ? (
        <DockEdge item={item} bodies={bodies} />
      ) : (
        <DockColumn
          item={item}
          bodies={bodies}
          closeLabel="Hide the side panel"
          closeChord={shortcutLabel("toggle-dock")}
          onClose={onClose}
        />
      )}
    </aside>
  );
}
