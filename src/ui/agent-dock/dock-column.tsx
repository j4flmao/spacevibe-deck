import type { ComponentChildren } from "preact";
import type { RailItem } from "../rail-view-model";
import { DockHeader } from "./dock-header";
import { DockSection } from "./dock-section";

/**
 * What the sections show. `App` picks the bodies, as it does for the legacy column, so this
 * directory never imports a feature (`src/files`, `src/ui/usage`, `src/ui/sessions`).
 */
export interface DockBodies {
  /**
   * The Explorer: the Files tree, the Changes list and the open document, until the Changes
   * section splits off. It is rooted at `root`, the folder the focused agent stands in.
   */
  readonly files: (root: string | null) => ComponentChildren;
  readonly usage: ComponentChildren;
  /** Null where the host cannot list sessions, so the section is left out. */
  readonly history: ComponentChildren | null;
}

export interface DockColumnProps {
  readonly item: RailItem | null;
  /** The folder the sections show (`dock-root.ts`). */
  readonly root: string | null;
  readonly bodies: DockBodies;
  readonly closeLabel: string;
  readonly closeChord: string | null;
  readonly onClose: () => void;
}

/**
 * The legacy bodies assume a column that owns the height: the file tree windows its rows against
 * its own scroller. Under one stacked scroll that height is undefined, so each body gets a box.
 */
export function DockColumn({
  item,
  root,
  bodies,
  closeLabel,
  closeChord,
  onClose,
}: DockColumnProps) {
  return (
    <div className="agent-dock__column flex h-full min-h-0 flex-col">
      <DockHeader item={item} closeLabel={closeLabel} closeChord={closeChord} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DockSection id="files" title="Files">
          <div className="h-96 min-h-0">{bodies.files(root)}</div>
        </DockSection>
        <DockSection id="usage" title="Usage">
          <div className="max-h-96 overflow-y-auto">{bodies.usage}</div>
        </DockSection>
        {bodies.history === null ? null : (
          <DockSection id="history" title="History">
            <div className="max-h-96 overflow-y-auto">{bodies.history}</div>
          </DockSection>
        )}
      </div>
    </div>
  );
}
