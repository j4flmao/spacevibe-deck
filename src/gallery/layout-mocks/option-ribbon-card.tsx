import { Badge } from "../../ui/controls/badge";
import { Separator } from "../../ui/controls/separator";
import { AgentLogo, AgentStateMark } from "./agent-parts";
import { AGENT_NAME, STATE_LABEL, placeOf, type MockAgent } from "./layout-fixture";
import { RibbonIcon, totals } from "./option-ribbon-parts";

/** The body of a chip's hover card: a dense two-column fact sheet. */
export function RibbonAgentCard({ agent }: { readonly agent: MockAgent }) {
  const { checkout, project } = placeOf(agent);
  const sum = totals(agent);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <AgentLogo kind={agent.kind} className="size-4" />
        <span className="text-sm font-medium text-foreground">{AGENT_NAME[agent.kind]}</span>
        <span className="ml-auto flex items-center gap-1.5 text-foreground">
          <AgentStateMark state={agent.state} confidence={agent.confidence} />
          {STATE_LABEL[agent.state]}
          <span className="text-muted-foreground tabular-nums">· {agent.since}</span>
        </span>
      </div>
      {agent.sentence ? <p className="m-0 line-clamp-3 text-foreground">{agent.sentence}</p> : null}
      {agent.state === "needs-you" && agent.ask ? (
        <div className="rounded-md border border-amber-600/50 bg-muted px-2 py-1.5 font-mono text-[11px] text-foreground dark:border-amber-400/50">
          {agent.ask}
        </div>
      ) : null}
      <Separator />
      <dl className="m-0 grid grid-cols-[3.5rem_1fr] items-center gap-x-2 gap-y-1.5">
        <dt className="text-muted-foreground">Where</dt>
        <dd className="m-0 flex min-w-0 items-center gap-1.5 text-foreground">
          <span className="truncate">
            {project.name} <span className="text-muted-foreground">/</span>{" "}
            {checkout.branch ?? "no branch"}
          </span>
          {checkout.worktree ? (
            <Badge variant="outline" className="h-4 px-1.5 text-foreground">
              <RibbonIcon name="branch" size={10} />
              worktree
            </Badge>
          ) : null}
        </dd>
        <dt className="text-muted-foreground">Changes</dt>
        <dd className="m-0 text-foreground tabular-nums">
          {sum.files === 0 ? (
            <span className="text-muted-foreground">None</span>
          ) : (
            <>
              {sum.files} {sum.files === 1 ? "file" : "files"}{" "}
              <span className="text-(--term-ok)">+{sum.added}</span>{" "}
              <span className="text-(--term-err)">−{sum.removed}</span>
            </>
          )}
        </dd>
        <dt className="text-muted-foreground">Usage</dt>
        <dd className="m-0 text-foreground tabular-nums">
          {agent.tokens} tokens <span className="text-muted-foreground">·</span> {agent.cost}
        </dd>
      </dl>
    </div>
  );
}
