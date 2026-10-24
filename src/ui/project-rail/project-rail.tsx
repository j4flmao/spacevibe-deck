import { useEffect, useMemo } from "preact/hooks";
import type { AgentRailView } from "../agent-rail-model";
import { buildRailView, type RailGroup } from "../rail-view-model";
import { ProjectRailHeader } from "./project-rail-header";
import { isRailItemFocused, selectRailItem, type RailSelection } from "./project-rail-model";
import { ProjectRailRow } from "./project-rail-row";
import {
  foldedProjects,
  railViewState,
  runRailClock,
  toggleProjectFolded,
} from "./project-rail-state";

/** The things arrow keys walk: every project header and every row of an open project. */
const STOPS = "[data-rail-project],[data-rail-row]";

export interface ProjectRailProps extends RailSelection {
  /** The view `AgentRail` already builds, so the two rails cannot disagree about it. */
  readonly view: AgentRailView;
}

function ProjectSection({
  group,
  folded,
  tabStopId,
  selection,
}: {
  readonly group: RailGroup;
  readonly folded: boolean;
  readonly tabStopId: string | undefined;
  readonly selection: RailSelection;
}) {
  return (
    <section aria-label={group.label}>
      <ProjectRailHeader
        group={group}
        folded={folded}
        onToggle={() => toggleProjectFolded(group.key)}
      />
      {folded
        ? null
        : group.items.map((item) => (
            <ProjectRailRow
              key={item.id}
              item={item}
              tabStop={item.id === tabStopId}
              onSelect={() => selectRailItem(item, selection)}
            />
          ))}
      {!folded && group.items.length === 0 ? (
        <p className="px-5 py-2 text-xs text-muted-foreground">No sessions</p>
      ) : null}
    </section>
  );
}

/**
 * Up and down walk the list, and Enter presses the row. Local to the list on purpose: a
 * bare key is the terminal's, so nothing here listens on the window.
 */
function onListKeyDown(event: KeyboardEvent): void {
  const target = event.target;
  // A chord is the keymap's (⌘⌥↑ focuses a pane, ⌘⇧↵ is a binding): only the bare key walks.
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey ||
    !(target instanceof HTMLElement) ||
    !target.matches(STOPS)
  ) {
    return;
  }
  if (event.key === "Enter" && target.matches("[data-rail-row]")) {
    // The press below is the one selection; the click Enter would add is cancelled.
    event.preventDefault();
    target.click();
    return;
  }
  const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
  if (step === 0 || !(event.currentTarget instanceof HTMLElement)) {
    return;
  }
  const stops = [...event.currentTarget.querySelectorAll<HTMLElement>(STOPS)];
  const next = stops[stops.indexOf(target) + step];
  if (next !== undefined) {
    event.preventDefault();
    next.focus();
  }
}

/**
 * The project-first rail's list (spec LAY-1..LAY-4), mounted by `AgentRail` behind the
 * `projectRail` release switch in place of its cluster list.
 */
export function ProjectRail({ view, onFocusPane, onSelectTab }: ProjectRailProps) {
  useEffect(() => runRailClock(), []);
  const state = railViewState.value;
  const folded = foldedProjects.value;
  // The memo reads the clock once, as the shipped rail's does; only time grouping uses it.
  const model = useMemo(() => buildRailView(view, state, Date.now()), [view, state]);
  const open = model.groups.filter((group) => !folded.has(group.key));
  const rows = open.flatMap((group) => group.items);
  // One Tab stop for all rows: the row that holds the keyboard, else the first.
  const tabStopId = (rows.find(isRailItemFocused) ?? rows[0])?.id;
  const selection: RailSelection = { onFocusPane, onSelectTab };
  return (
    <section
      aria-label="Open agents"
      onKeyDown={onListKeyDown}
      className="ui-preset min-w-0 bg-transparent pb-3"
    >
      {model.groups.map((group) => (
        <ProjectSection
          key={group.key}
          group={group}
          folded={folded.has(group.key)}
          tabStopId={tabStopId}
          selection={selection}
        />
      ))}
      {model.groups.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs text-muted-foreground">Nothing here</p>
      ) : null}
    </section>
  );
}
