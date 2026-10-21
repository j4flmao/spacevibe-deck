import { cn } from "cn";
import { AgentLogo, AgentStateMark } from "./agent-parts";
import {
  AGENT_NAME,
  STATE_LABEL,
  placeOf,
  type MockAgent,
  type MockState,
  type TermLine,
} from "./layout-fixture";
import { MockTerminal } from "./mock-terminal";

const BOX_ONLY = /^[\s│╭╮╰╯─]*$/;
const SNAPSHOT_ROWS = 4;

/** The tail worth glancing at: no blanks, footers or box edges; a prompt row only when last. */
function snapshotRows(lines: readonly TermLine[]): TermLine[] {
  const rows = lines
    .map((line): TermLine => {
      const spans = line.filter(([, text]) => text.trim() !== "│");
      return spans.map(([tone, text], index) =>
        index === spans.length - 1 ? ([tone, text.trimEnd()] as const) : ([tone, text] as const),
      );
    })
    .filter(
      (line) =>
        (!line.every(([, text]) => BOX_ONLY.test(text)) &&
          !line.every(([tone, text]) => tone === "dim" || text.trim() === "")) ||
        line.some(([tone]) => tone === "cursor"),
    );
  const kept = rows.filter(
    (line, index) => index === rows.length - 1 || !line.some(([tone]) => tone === "cursor"),
  );
  return kept.slice(-SNAPSHOT_ROWS);
}

/** Only the states that ask something of you carry a hue on the card's edge. */
const EDGE: Partial<Record<MockState, string>> = {
  failed: "bg-red-600 dark:bg-red-500",
  "needs-you": "bg-amber-500 dark:bg-amber-400",
};

export function branchOf(agent: MockAgent): string {
  return placeOf(agent).checkout.branch ?? "no branch";
}

/** One filmstrip card: state, then sentence, then a four-row text snapshot of the pane. */
export function FilmstripCard({
  agent,
  onSwap,
}: {
  readonly agent: MockAgent;
  readonly onSwap: (id: string) => void;
}) {
  const { project } = placeOf(agent);
  const name = AGENT_NAME[agent.kind];
  const label = STATE_LABEL[agent.state];
  return (
    <button
      type="button"
      aria-label={`${name}, ${label}, ${project.name} ${branchOf(agent)}`}
      onClick={() => onSwap(agent.id)}
      className={cn(
        "relative flex w-full flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-colors outline-none",
        "hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
      )}
    >
      {EDGE[agent.state] ? (
        <span
          aria-hidden="true"
          className={cn("absolute inset-y-3 left-0 w-0.5 rounded-r-full", EDGE[agent.state])}
        />
      ) : null}
      <div className="flex items-center gap-2">
        <span className="relative shrink-0">
          <AgentLogo kind={agent.kind} className="size-5" />
          <span className="absolute -right-1 -bottom-1 grid size-3.5 place-items-center rounded-full bg-card">
            <AgentStateMark state={agent.state} confidence={agent.confidence} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-xs font-medium text-foreground">{name}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
              {label} · {agent.since}
            </span>
          </div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">
            {project.name.replace("spacevibe-", "")} / {branchOf(agent)}
          </div>
        </div>
      </div>
      {agent.sentence ? (
        <p className="line-clamp-2 text-[13px]/[1.4] text-foreground">{agent.sentence}</p>
      ) : null}
      {agent.ask ? (
        <p className="truncate rounded-md border bg-muted px-2 py-1 font-mono text-[11px] text-foreground">
          {agent.ask}
        </p>
      ) : null}
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-md border [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]"
      >
        <MockTerminal
          lines={snapshotRows(agent.terminal)}
          className="px-2 py-1.5 text-[10.5px] leading-[15px]"
        />
      </div>
    </button>
  );
}
