import { cn } from "cn";
import { AgentLogo, AgentStateMark } from "./agent-parts";
import { branchOf } from "./option-filmstrip-card";
import {
  AGENT_NAME,
  STATE_LABEL,
  agentById,
  type MockAgent,
  type MockSpace,
} from "./layout-fixture";
import { MockTerminal } from "./mock-terminal";

/** One live pane: an identity header in one line, then the terminal pinned to its tail. */
function StagePane({
  agent,
  focused,
  onFocus,
}: {
  readonly agent: MockAgent;
  readonly focused: boolean;
  readonly onFocus: (id: string) => void;
}) {
  return (
    <section
      tabIndex={0}
      aria-label={`${AGENT_NAME[agent.kind]}, ${STATE_LABEL[agent.state]}${focused ? ", focused" : ""}`}
      onClick={() => onFocus(agent.id)}
      onFocus={() => onFocus(agent.id)}
      className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-(--term-bg) outline-none"
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b bg-background px-3">
        <AgentStateMark state={agent.state} confidence={agent.confidence} />
        <AgentLogo kind={agent.kind} className="size-3.5" />
        <span
          className={cn(
            "shrink-0 text-xs font-medium",
            focused ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {AGENT_NAME[agent.kind]}
        </span>
        <span className="shrink-0 rounded-sm border px-1.5 font-mono text-[11px]/[18px] text-muted-foreground">
          {branchOf(agent)}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {agent.sentence ?? ""}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
          {agent.since}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <MockTerminal lines={agent.terminal} className="shrink-0" />
      </div>
      {focused ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border border-foreground/40 [border-color:color-mix(in_oklab,var(--foreground)_40%,transparent)]"
        />
      ) : null}
    </section>
  );
}

/** The current space, laid out by its own split; remounts per space so a swap fades in. */
export function FilmstripStage({
  space,
  focusId,
  onFocus,
}: {
  readonly space: MockSpace;
  readonly focusId: string;
  readonly onFocus: (id: string) => void;
}) {
  return (
    <div
      key={space.id}
      className={cn(
        "flex min-h-0 min-w-0 flex-1 animate-in gap-px bg-border duration-150 fade-in-0",
        space.split === "column" ? "flex-col" : "flex-row",
      )}
    >
      {space.paneIds.map((id) => (
        <StagePane key={id} agent={agentById(id)} focused={id === focusId} onFocus={onFocus} />
      ))}
    </div>
  );
}
