import { useSignal, type Signal } from "@preact/signals";
import { PROJECTS } from "../../layout-fixture";
import { seedAgents, type Grouping, type RailAgent, type Sorting } from "./rail-option-b-model";

export interface RailState {
  readonly agents: Signal<readonly RailAgent[]>;
  readonly grouping: Signal<Grouping>;
  readonly sorting: Signal<Sorting>;
  readonly archivedOpen: Signal<boolean>;
  /** Folded group keys, kept per grouping. */
  readonly folded: Signal<Readonly<Record<Grouping, ReadonlySet<string>>>>;
  readonly query: Signal<string>;
  readonly sel: Signal<string>;
  readonly stop: Signal<string>;
  readonly editing: Signal<string | null>;
  readonly menuFor: Signal<string | null>;
  /** Short confirmation text shown in a row's time slot. */
  readonly flash: Signal<{ readonly id: string; readonly text: string } | null>;
  patch(id: string, change: Partial<RailAgent>): void;
  toggleFold(key: string): void;
  add(projectId: string, branch: string | null, path?: string): void;
  note(id: string, text: string): void;
}

let serial = 0;

export function useRailState(initial: string): RailState {
  const agents = useSignal<readonly RailAgent[]>(seedAgents());
  const grouping = useSignal<Grouping>("status");
  const sorting = useSignal<Sorting>("priority");
  const archivedOpen = useSignal(false);
  const folded = useSignal<Readonly<Record<Grouping, ReadonlySet<string>>>>({
    status: new Set(["quiet"]),
    project: new Set(),
    time: new Set(),
  });
  const query = useSignal("");
  const sel = useSignal(initial);
  const stop = useSignal(initial);
  const editing = useSignal<string | null>(null);
  const menuFor = useSignal<string | null>(null);
  const flash = useSignal<{ id: string; text: string } | null>(null);

  return {
    agents,
    grouping,
    sorting,
    archivedOpen,
    folded,
    query,
    sel,
    stop,
    editing,
    menuFor,
    flash,
    patch(id, change) {
      agents.value = agents.value.map((row) => (row.id === id ? { ...row, ...change } : row));
    },
    toggleFold(key) {
      const mode = grouping.value;
      const next = new Set(folded.value[mode]);
      if (!next.delete(key)) next.add(key);
      folded.value = { ...folded.value, [mode]: next };
    },
    add(projectId, branch, path) {
      serial += 1;
      const project = PROJECTS.find((item) => item.id === projectId) ?? PROJECTS[0];
      const id = `b-new-${serial}`;
      const fresh: RailAgent = {
        id,
        kind: "claude",
        spaceId: "",
        state: "idle",
        confidence: "explicit",
        sentence: null,
        ask: null,
        since: "1s",
        tokens: "0",
        cost: "$0.00",
        terminal: [],
        projectId: project.id,
        branch,
        path: path ?? `~/dev/${project.name}`,
        label: null,
        pinned: false,
        archived: false,
      };
      agents.value = [fresh, ...agents.value];
      // Open the lane the new row lands in so it never hides.
      const without = (mode: Grouping, key: string) =>
        new Set([...folded.value[mode]].filter((item) => item !== key));
      folded.value = {
        status: without("status", "quiet"),
        project: without("project", project.id),
        time: without("time", "t1"),
      };
      sel.value = id;
      stop.value = id;
    },
    note(id, text) {
      flash.value = { id, text };
      setTimeout(() => {
        if (flash.value?.id === id) flash.value = null;
      }, 1200);
    },
  };
}
