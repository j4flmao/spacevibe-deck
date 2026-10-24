import { useEffect, useMemo, useState } from "preact/hooks";
import type { AgentRailView } from "../agent-rail-model";
import { Button } from "../controls/button";
import { buildRailView } from "../rail-view-model";
import type { RailRowDeps } from "./project-rail-commands";
import { isRailItemFocused, type RailSelection } from "./project-rail-model";
import { FlatSection, ProjectSection, type RailRowEnv } from "./project-rail-sections";
import {
  foldedProjects,
  railNow,
  railViewState,
  runRailClock,
  setRailQuery,
} from "./project-rail-state";

/** The things arrow keys walk: every project header and every row of an open project. */
const STOPS = "[data-rail-project],[data-rail-row]";

/** While a search is set no project is folded: every one with a match shows it. */
const NO_FOLDS: ReadonlySet<string> = new Set();

export interface ProjectRailProps extends RailSelection, RailRowDeps {
  /** The view `AgentRail` already builds, so the two rails cannot disagree about it. */
  readonly view: AgentRailView;
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
export function ProjectRail({ view, onFocusPane, onSelectTab, ...deps }: ProjectRailProps) {
  useEffect(() => runRailClock(), []);
  const state = railViewState.value;
  const searching = state.query.trim() !== "";
  const byProject = state.grouping === "project";
  // The user's folds are kept aside, so clearing a search brings them back.
  const folded = searching || !byProject ? NO_FOLDS : foldedProjects.value;
  // The row the keyboard last stood on: it keeps the Tab stop (and its buttons) while it lives.
  const [activeId, setActiveId] = useState<string | null>(null);
  // The memo reads the clock once, as the shipped rail's does. Only time buckets age, so only
  // that grouping follows the ticking clock; the others never rebuild on a tick.
  const clock = state.grouping === "time" ? railNow.value : 0;
  const model = useMemo(
    () => buildRailView(view, state, clock === 0 ? Date.now() : clock),
    [view, state, clock],
  );
  const rows = model.groups
    .filter((group) => !folded.has(group.key))
    .flatMap((group) => group.items);
  // One Tab stop for all rows: where the keyboard last was, else the focused row, else the first.
  const tabStopId = (
    rows.find((item) => item.id === activeId) ??
    rows.find(isRailItemFocused) ??
    rows[0]
  )?.id;
  const env: RailRowEnv = {
    tabStopId,
    pinned: state.pinned,
    selection: { onFocusPane, onSelectTab },
    deps,
  };
  return (
    <section
      aria-label="Open agents"
      onKeyDown={onListKeyDown}
      onFocusCapture={(event: FocusEvent) => {
        const row =
          event.target instanceof Element ? event.target.closest("[data-rail-item]") : null;
        if (row !== null) {
          setActiveId(row.getAttribute("data-rail-item"));
        }
      }}
      className="ui-preset min-w-0 bg-transparent pb-3"
    >
      {model.groups.map((group) =>
        byProject ? (
          <ProjectSection key={group.key} group={group} folded={folded.has(group.key)} env={env} />
        ) : (
          <FlatSection key={group.key} group={group} env={env} />
        ),
      )}
      {model.groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-xs text-muted-foreground">
          <p>{searching ? "No sessions match" : "Nothing here"}</p>
          {searching ? (
            <Button variant="outline" size="sm" onClick={() => setRailQuery("")}>
              Clear search
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
