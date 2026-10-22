import { useSignal } from "@preact/signals";
import { Badge } from "../../../../ui/controls/badge";
import { AgentLogo } from "../../agent-parts";
import { AGENT_NAME, agentById, type MockAgent, type MockFileChange } from "../../layout-fixture";
import { Chevron, Counts, EmptyChanges, RefreshButton, changesOf, totalsOf } from "./changes-parts";
import { FileRow, flipped } from "./changes-row";

interface Group {
  readonly key: string;
  readonly by: string;
  readonly turn: number;
  readonly files: MockFileChange[];
}

/** The focused agent's turns first (newest on top), then the other agents'. */
function groupsOf(changes: readonly MockFileChange[], focusId: string): Group[] {
  const groups = new Map<string, Group>();
  for (const change of changes) {
    const key = `${change.by}:${change.turn}`;
    const group = groups.get(key) ?? { key, by: change.by, turn: change.turn, files: [] };
    group.files.push(change);
    groups.set(key, group);
  }
  return [...groups.values()].sort(
    (a, b) =>
      Number(b.by === focusId) - Number(a.by === focusId) ||
      a.by.localeCompare(b.by) ||
      b.turn - a.turn,
  );
}

export function TurnChanges({ agent }: { agent: MockAgent }) {
  const changes = changesOf(agent);
  const closed = useSignal<ReadonlySet<string>>(new Set());
  const open = useSignal<ReadonlySet<string>>(new Set());
  const selected = useSignal<string | null>(null);
  if (changes.length === 0) return <EmptyChanges />;
  const groups = groupsOf(changes, agent.id);
  const latest = groups.find((group) => group.by === agent.id)?.key;
  return (
    <div className="flex min-h-0 flex-col text-xs">
      <div className="flex h-9 items-center justify-between pr-2 pl-3 text-foreground">
        <span className="tabular-nums">{changes.length} files</span>
        <RefreshButton />
      </div>
      {groups.map((group) => {
        const who = agentById(group.by);
        const sums = totalsOf(group.files);
        const shown = !closed.value.has(group.key);
        return (
          <section
            key={group.key}
            aria-label={`${AGENT_NAME[who.kind]} turn ${group.turn}`}
            className="border-t first:border-t-0"
          >
            <button
              type="button"
              aria-expanded={shown}
              onClick={() => (closed.value = flipped(closed.value, group.key))}
              className="flex h-8 w-full items-center gap-2 pr-3 pl-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="text-muted-foreground">
                <Chevron open={shown} />
              </span>
              <AgentLogo kind={who.kind} className="size-3.5" />
              <span className="min-w-0 truncate font-medium text-foreground">
                {AGENT_NAME[who.kind]} · turn {group.turn}
              </span>
              {group.key === latest ? <Badge variant="secondary">Latest</Badge> : null}
              <span className="ml-auto">
                <Counts added={sums.added} removed={sums.removed} />
              </span>
            </button>
            {shown ? (
              <ul className="m-0 list-none p-0">
                {group.files.map((change) => (
                  <FileRow
                    key={change.path}
                    change={change}
                    agent={agent}
                    fullPath
                    selected={selected.value === change.path}
                    onSelect={() => (selected.value = change.path)}
                    expanded={open.value.has(change.path)}
                    onToggle={() => (open.value = flipped(open.value, change.path))}
                  />
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
