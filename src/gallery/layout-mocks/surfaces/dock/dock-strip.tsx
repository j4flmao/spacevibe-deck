import { signal } from "@preact/signals";
import { cn } from "cn";
import { Button } from "../../../../ui/controls/button";
import { Kbd, KbdGroup } from "../../../../ui/controls/kbd";
import { ScrollArea } from "../../../../ui/controls/scroll-area";
import { Separator } from "../../../../ui/controls/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/controls/tooltip";
import { AgentLogo, AgentStateMark } from "../../agent-parts";
import { AGENT_NAME, STATE_LABEL, placeOf, type MockAgent } from "../../layout-fixture";
import {
  AskBlock,
  DockIcon,
  NARROW_BELOW,
  TOOLS,
  ToolBody,
  changeTotals,
  useWindowWidth,
  type DockIconName,
  type ToolId,
} from "./dock-parts";

const PANEL_WIDTH = 296;

type GlobalId = "prompts" | "browser" | "settings";
type StripTool = ToolId | GlobalId;

const GLOBAL_TOOLS: readonly { id: GlobalId; label: string; icon: DockIconName }[] = [
  { id: "prompts", label: "Prompts", icon: "prompts" },
  { id: "browser", label: "Browser", icon: "browser" },
  { id: "settings", label: "Settings", icon: "settings" },
];

const GLOBAL_ROWS: Readonly<Record<GlobalId, readonly string[]>> = {
  prompts: ["Review the staged diff", "Write a failing test first", "Summarize this session"],
  browser: ["localhost:5173", "docs/internals/overview", "github.com/pulls"],
  settings: ["Appearance", "Shortcuts", "Agents", "Notifications"],
};

const TOOL_ICON: Readonly<Record<ToolId, DockIconName>> = {
  agent: "ask",
  changes: "changes",
  files: "files",
  usage: "usage",
  history: "history",
};

/** `undefined` until the user picks: the default then depends on the window width. */
const chosen = signal<StripTool | null | undefined>(undefined);

function StripButton({
  label,
  keys,
  active,
  onClick,
  badge,
  children,
}: {
  readonly label: string;
  readonly keys?: readonly string[];
  readonly active: boolean;
  readonly onClick: () => void;
  readonly badge?: string;
  readonly children: preact.ComponentChildren;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={label}
            aria-pressed={active}
            onClick={onClick}
            className={cn("relative", active && "bg-muted text-foreground")}
          />
        }
      >
        {children}
        {badge ? (
          <span className="absolute -top-0.5 -right-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-foreground px-1 text-[9px] font-semibold text-background tabular-nums">
            {badge}
          </span>
        ) : null}
      </TooltipTrigger>
      <TooltipContent side="left">
        {label}
        {keys ? (
          <KbdGroup>
            {keys.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </KbdGroup>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

function GlobalBody({ tool }: { readonly tool: GlobalId }) {
  return (
    <ul className="m-0 list-none p-1">
      {GLOBAL_ROWS[tool].map((row) => (
        <li key={row}>
          <Button
            variant="ghost"
            className="h-8 w-full justify-start px-2 font-normal text-foreground"
          >
            {row}
          </Button>
        </li>
      ))}
    </ul>
  );
}

function Panel({
  tool,
  agent,
  onFocus,
}: {
  readonly tool: StripTool;
  readonly agent: MockAgent;
  readonly onFocus: (id: string) => void;
}) {
  const global = GLOBAL_TOOLS.find((item) => item.id === tool);
  const title =
    global?.label ?? (tool === "agent" ? "Agent" : TOOLS.find((t) => t.id === tool)?.label);
  const { checkout } = placeOf(agent);
  return (
    <section
      aria-label={title}
      style={{ width: PANEL_WIDTH }}
      className="flex shrink-0 flex-col border-l bg-background"
    >
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3">
        <h2 className="m-0 text-xs font-medium text-foreground">{title}</h2>
        {global ? null : (
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            <AgentLogo kind={agent.kind} />
            <span className="truncate">{checkout.branch ?? "no branch"}</span>
          </span>
        )}
      </header>
      {global ? null : tool === "agent" ? null : <AskBlock agent={agent} onFocus={onFocus} />}
      <ScrollArea className="min-h-0 flex-1">
        {global ? (
          <GlobalBody tool={global.id} />
        ) : (
          <ToolBody tool={tool as ToolId} agent={agent} onFocus={onFocus} />
        )}
      </ScrollArea>
    </section>
  );
}

function DockStrip({
  agent,
  onFocus,
}: {
  readonly agent: MockAgent;
  readonly onFocus: (id: string) => void;
}) {
  const narrow = useWindowWidth() < NARROW_BELOW;
  const active = chosen.value === undefined ? (narrow ? null : "changes") : chosen.value;
  const sum = changeTotals(agent);
  const toggle = (tool: StripTool) => {
    chosen.value = active === tool ? null : tool;
  };
  return (
    <aside aria-label="Dock" className="flex shrink-0">
      {active ? <Panel tool={active} agent={agent} onFocus={onFocus} /> : null}
      <nav
        aria-label="Dock tools"
        className="flex w-11 shrink-0 flex-col items-center gap-1 border-l bg-sidebar py-2"
      >
        <StripButton
          label={`${AGENT_NAME[agent.kind]}, ${STATE_LABEL[agent.state]}`}
          active={active === "agent"}
          onClick={() => toggle("agent")}
        >
          <AgentStateMark state={agent.state} confidence={agent.confidence} />
        </StripButton>
        <Separator className="my-1 w-5" />
        {TOOLS.map((tool) => (
          <StripButton
            key={tool.id}
            label={tool.label}
            keys={tool.keys}
            active={active === tool.id}
            onClick={() => toggle(tool.id)}
            badge={tool.id === "changes" && sum.files ? String(sum.files) : undefined}
          >
            <DockIcon name={TOOL_ICON[tool.id]} />
          </StripButton>
        ))}
        <div className="flex-1" />
        <Separator className="my-1 w-5" />
        {GLOBAL_TOOLS.map((tool) => (
          <StripButton
            key={tool.id}
            label={tool.label}
            active={active === tool.id}
            onClick={() => toggle(tool.id)}
          >
            <DockIcon name={tool.icon} />
          </StripButton>
        ))}
      </nav>
    </aside>
  );
}

export const stripSlots = {
  dock: (agent: MockAgent, focus: (id: string) => void) => (
    <DockStrip agent={agent} onFocus={focus} />
  ),
};
