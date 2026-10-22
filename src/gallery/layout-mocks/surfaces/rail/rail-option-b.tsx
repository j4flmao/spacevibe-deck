import { useEffect, useRef } from "preact/hooks";
import {
  AGENTS,
  AGENT_NAME,
  PROJECTS,
  STATE_LABEL,
  wantsUser,
  type MockAgent,
} from "../../layout-fixture";
import type { PanelOption } from "../surface-types";
import { EmptyState, GroupHeader } from "./rail-option-b-groups";
import { RailFooter } from "./rail-option-b-footer";
import { RailHeader } from "./rail-option-b-header";
import { buildGroups, type RailAgent } from "./rail-option-b-model";
import { AgentRow } from "./rail-option-b-row";
import { useRailState } from "./rail-option-b-state";

const FIXTURE_IDS: ReadonlySet<string> = new Set(AGENTS.map((item) => item.id));

function matches(agent: RailAgent, query: string): boolean {
  if (query === "") return true;
  const project = PROJECTS.find((item) => item.id === agent.projectId)?.name ?? "";
  const hay = [
    agent.label,
    agent.sentence,
    agent.ask,
    AGENT_NAME[agent.kind],
    STATE_LABEL[agent.state],
    project,
    agent.branch,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(query.toLowerCase());
}

/** ArrowUp/Down/Home/End walk the rows and group headers; Esc clears a search. */
function walk(event: KeyboardEvent, clear: () => void) {
  const target = event.target as HTMLElement;
  if (target.closest("input")) return;
  const here = target.closest<HTMLElement>("[data-nav]");
  if (event.key === "Escape") {
    clear();
    return;
  }
  const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
  if (!here || !keys.includes(event.key)) return;
  const items = [
    ...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("[data-nav]"),
  ];
  const at = items.indexOf(here);
  const last = items.length - 1;
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? last
        : Math.min(last, Math.max(0, at + (event.key === "ArrowDown" ? 1 : -1)));
  event.preventDefault();
  items[next]?.focus();
}

function RailB({
  agent,
  focus,
}: {
  readonly agent: MockAgent;
  readonly focus: (id: string) => void;
}) {
  const s = useRailState(agent.id);
  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The board owns focus for fixture agents; follow it.
    s.sel.value = agent.id;
    s.stop.value = agent.id;
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

  const select = (id: string) => {
    s.sel.value = id;
    s.stop.value = id;
    if (FIXTURE_IDS.has(id)) focus(id);
  };
  const query = s.query.value;
  const searching = query !== "";
  const all = s.agents.value;
  const active = all.filter((row) => !row.archived && matches(row, query));
  const archived = all.filter((row) => row.archived && matches(row, query));
  const groups = buildGroups(active, s.grouping.value, s.sorting.value, PROJECTS);
  const folded = s.folded.value[s.grouping.value];
  const shown = (key: string) => searching || !folded.has(key);
  const rendered = groups.flatMap((group) => (shown(group.key) ? group.rows : []));
  const stopId = [...rendered, ...(s.archivedOpen.value ? archived : [])].some(
    (row) => row.id === s.stop.value,
  )
    ? s.stop.value
    : (rendered[0]?.id ?? "");
  const attention = all.filter((row) => !row.archived && wantsUser(row.state)).length;
  const byProject = s.grouping.value === "project";

  const row = (item: RailAgent, withProject: boolean) => (
    <AgentRow
      key={item.id}
      s={s}
      agent={item}
      withProject={withProject}
      selected={item.id === s.sel.value}
      tabbable={item.id === stopId}
      onSelect={select}
    />
  );

  return (
    <aside
      aria-label="Agents"
      onKeyDown={(event: KeyboardEvent) => {
        const target = event.target as HTMLElement;
        if (event.key !== "/" || target.closest("input,textarea")) return;
        event.preventDefault();
        searchRef.current?.querySelector("input")?.focus();
      }}
      className="flex h-full flex-col bg-sidebar text-sidebar-foreground"
    >
      <RailHeader s={s} searchRef={searchRef} />
      <nav
        aria-label="Agent list"
        onKeyDown={(event: KeyboardEvent) =>
          walk(event, () => {
            if (s.query.value !== "") s.query.value = "";
          })
        }
        className="min-h-0 flex-1 overflow-y-auto pb-2"
      >
        {active.length === 0 ? (
          <EmptyState
            searching={searching}
            onClear={() => {
              s.query.value = "";
            }}
            onNew={() => s.add(PROJECTS[0].id, "main")}
          />
        ) : null}
        {groups.map((group) => (
          <div key={group.key} className="pt-2">
            <GroupHeader
              group={{ label: group.label, count: group.rows.length }}
              open={shown(group.key)}
              onToggle={() => s.toggleFold(group.key)}
              onAdd={
                byProject && group.projectId !== undefined
                  ? () => s.add(group.projectId ?? "", "main")
                  : undefined
              }
            />
            {shown(group.key)
              ? group.rows.map((item) => row(item, group.key === "pinned" || !byProject))
              : null}
          </div>
        ))}
        {archived.length > 0 ? (
          <div className="pt-2">
            <GroupHeader
              group={{ label: "Archived", count: archived.length }}
              open={s.archivedOpen.value}
              onToggle={() => {
                s.archivedOpen.value = !s.archivedOpen.value;
              }}
            />
            {s.archivedOpen.value ? archived.map((item) => row(item, true)) : null}
          </div>
        ) : null}
      </nav>
      <RailFooter attention={attention} />
    </aside>
  );
}

export const RAIL_B: PanelOption = {
  id: "b",
  label: "List+Organize",
  concept:
    "One flat list that you reshape with an Organize menu: group by status, project or time, sort by priority or recency, with pinned rows always on top.",
  area: ["chrome-only"],
  frame: "panel",
  width: 300,
  render: (agent, focus) => <RailB agent={agent} focus={focus} />,
};
