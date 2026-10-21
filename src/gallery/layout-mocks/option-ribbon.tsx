import { useSignal } from "@preact/signals";
import { cn } from "cn";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { Badge } from "../../ui/controls/badge";
import { Button } from "../../ui/controls/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/controls/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../ui/controls/hover-card";
import { Separator } from "../../ui/controls/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/controls/tooltip";
import { AgentLogo, AgentStateMark, TrafficLights } from "./agent-parts";
import {
  AGENT_NAME,
  PROJECTS,
  STATE_LABEL,
  agentById,
  placeOf,
  spaceLabel,
  wantsUser,
  type MockAgent,
} from "./layout-fixture";
import type { OptionProps } from "./option-props";
import { RibbonAgentCard } from "./option-ribbon-card";
import { AgentDock } from "./agent-dock";
import { RibbonIcon, agentsOfProject } from "./option-ribbon-parts";
import { MockTerminal } from "./mock-terminal";

const NO_DRAG = { WebkitAppRegion: "no-drag" } as Record<string, string>;
const DRAG = { WebkitAppRegion: "drag" } as Record<string, string>;
/** Room one chip takes in the row, gap included; the overflow menu starts from it. */
const CHIP_SLOT = 148;
const HOVER_OVERLAY_AGENT = "a-auth-claude";

function chipLabel(agent: MockAgent): string {
  const { space, checkout } = placeOf(agent);
  if (space.paneIds.length > 1) return AGENT_NAME[agent.kind];
  return space.name ?? checkout.branch ?? spaceLabel(space);
}

function attention(project: string) {
  const agents = agentsOfProject(project);
  return { total: agents.length, need: agents.filter((a) => wantsUser(a.state)).length };
}

function AgentChip({
  agent,
  selected,
  open,
  onOpenChange,
  onSelect,
}: {
  readonly agent: MockAgent;
  readonly selected: boolean;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelect: () => void;
}) {
  const loud = agent.state === "needs-you" || agent.state === "failed";
  return (
    <HoverCard open={open} onOpenChange={onOpenChange}>
      <HoverCardTrigger
        delay={250}
        closeDelay={80}
        render={
          <Button
            variant="ghost"
            onClick={onSelect}
            aria-pressed={selected}
            aria-label={`${AGENT_NAME[agent.kind]}, ${chipLabel(agent)}, ${STATE_LABEL[agent.state]}`}
            style={NO_DRAG}
            className={cn(
              "relative h-7 max-w-[136px] gap-2 px-2 text-muted-foreground",
              selected && "bg-muted text-foreground",
              loud &&
                !selected &&
                (agent.state === "failed"
                  ? "border-red-600/60 dark:border-red-500/60"
                  : "border-amber-600/60 dark:border-amber-400/60"),
            )}
          >
            <span className="relative inline-flex">
              <AgentLogo kind={agent.kind} />
              <span className="absolute -right-1 -bottom-1 grid place-items-center rounded-full bg-background p-px">
                <AgentStateMark state={agent.state} confidence={agent.confidence} />
              </span>
            </span>
            <span className={cn("truncate", loud && "text-foreground")}>{chipLabel(agent)}</span>
            {selected ? (
              <span className="pointer-events-none absolute inset-x-2 -bottom-2 h-0.5 rounded-full bg-foreground" />
            ) : null}
          </Button>
        }
      />
      <HoverCardContent align="start" sideOffset={10} className="w-96">
        <RibbonAgentCard agent={agent} />
      </HoverCardContent>
    </HoverCard>
  );
}

function ProjectSwitcher({
  projectId,
  onPick,
}: {
  readonly projectId: string;
  readonly onPick: (projectId: string) => void;
}) {
  const current = PROJECTS.find((project) => project.id === projectId) ?? PROJECTS[0];
  const elsewhere = PROJECTS.filter((project) => project.id !== projectId).reduce(
    (sum, project) => sum + attention(project.id).need,
    0,
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            style={NO_DRAG}
            aria-label={`Project ${current.name}${elsewhere ? `, ${elsewhere} elsewhere need you` : ""}`}
            className="h-7 gap-1.5 px-2 text-sm font-medium text-foreground"
          />
        }
      >
        {current.name}
        {elsewhere ? (
          <Badge variant="secondary" className="h-4 min-w-4 px-1 tabular-nums text-foreground">
            {elsewhere}
          </Badge>
        ) : null}
        <RibbonIcon name="chevron" size={12} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Projects</DropdownMenuLabel>
          {PROJECTS.map((project) => {
            const { total, need } = attention(project.id);
            return (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onPick(project.id)}
                aria-current={project.id === projectId ? "true" : undefined}
                className={cn("h-8", project.id === projectId && "bg-foreground/10")}
              >
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
                {need ? (
                  <Badge variant="outline" className="text-foreground tabular-nums">
                    {need} need you
                  </Badge>
                ) : null}
                <span className="w-4 text-right text-muted-foreground tabular-nums">{total}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Pane({
  agent,
  focused,
  onFocus,
}: {
  readonly agent: MockAgent;
  readonly focused: boolean;
  readonly onFocus: () => void;
}) {
  return (
    <section
      aria-label={`${AGENT_NAME[agent.kind]}, ${STATE_LABEL[agent.state]}`}
      tabIndex={0}
      onPointerDown={onFocus}
      onFocus={onFocus}
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col bg-(--term-bg) outline-none",
        "after:pointer-events-none after:absolute after:inset-0 after:ring-1 after:ring-transparent after:transition-colors after:ring-inset",
        focused && "after:ring-foreground/30",
      )}
    >
      <header
        className={cn(
          "flex h-8 shrink-0 items-center gap-2 border-b px-3 text-xs",
          focused ? "bg-muted" : "bg-background",
        )}
      >
        <AgentLogo kind={agent.kind} className="size-3.5" />
        <span
          className={cn(
            "shrink-0 font-medium",
            focused ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {AGENT_NAME[agent.kind]}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            // Muted text on the focused header's bg-muted falls below AA in light mode.
            focused ? "text-foreground/80" : "text-muted-foreground",
          )}
        >
          {agent.sentence}
        </span>
      </header>
      <MockTerminal lines={agent.terminal} className="flex-1" />
    </section>
  );
}

export function OptionRibbon({ initialFocus, overlay }: OptionProps) {
  const focusId = useSignal(initialFocus);
  const dockOpen = useSignal(true);
  const hoverId = useSignal<string | null>(overlay === "hover" ? HOVER_OVERLAY_AGENT : null);
  const [rowWidth, setRowWidth] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(([entry]) => {
      setRowWidth(entry.contentRect.width);
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  const focused = agentById(focusId.value);
  const { project, space } = placeOf(focused);
  const agents = agentsOfProject(project.id);

  // Keep the focused chip visible; the rest of the row folds into "+N".
  const capacity = Math.max(1, Math.floor(rowWidth / CHIP_SLOT) - 1);
  const fits = agents.length <= Math.floor(rowWidth / CHIP_SLOT) || rowWidth === 0;
  const visible = fits
    ? agents
    : agents.filter(
        (agent, index) =>
          index < capacity - (agents.indexOf(focused) >= capacity ? 1 : 0) || agent === focused,
      );
  const hidden = agents.filter((agent) => !visible.includes(agent));

  const focus = (id: string) => {
    focusId.value = id;
  };
  const pickProject = (id: string) => {
    const first =
      agentsOfProject(id).find((agent) => wantsUser(agent.state)) ?? agentsOfProject(id)[0];
    if (first) focus(first.id);
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div style={DRAG} className="flex h-11 shrink-0 items-center gap-2 border-b pr-2.5 pl-3">
        <TrafficLights className="mr-2" />
        <ProjectSwitcher projectId={project.id} onPick={pickProject} />
        <Separator orientation="vertical" className="mx-1 h-4" />
        <div ref={rowRef} className="flex min-w-0 flex-1 items-center gap-1">
          {visible.map((agent, index) => (
            <div key={agent.id} className="flex items-center gap-1">
              {index > 0 && visible[index - 1].spaceId !== agent.spaceId ? (
                <Separator orientation="vertical" className="mx-1.5 h-3" />
              ) : null}
              <AgentChip
                agent={agent}
                selected={agent.id === focused.id}
                open={hoverId.value === agent.id}
                onOpenChange={(open) => {
                  if (open) hoverId.value = agent.id;
                  else if (hoverId.value === agent.id) hoverId.value = null;
                }}
                onSelect={() => focus(agent.id)}
              />
            </div>
          ))}
          {hidden.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    style={NO_DRAG}
                    aria-label={`${hidden.length} more agents`}
                    className="h-7 gap-1 px-2 text-muted-foreground tabular-nums"
                  />
                }
              >
                +{hidden.length}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {hidden.map((agent) => (
                  <DropdownMenuItem key={agent.id} onClick={() => focus(agent.id)} className="h-8">
                    <AgentLogo kind={agent.kind} />
                    <span className="min-w-0 flex-1 truncate">{chipLabel(agent)}</span>
                    <AgentStateMark state={agent.state} confidence={agent.confidence} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5" style={NO_DRAG}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Dock"
                  aria-pressed={dockOpen.value}
                  onClick={() => {
                    dockOpen.value = !dockOpen.value;
                  }}
                  className={cn(
                    "text-muted-foreground",
                    dockOpen.value && "bg-muted text-foreground",
                  )}
                />
              }
            >
              <RibbonIcon name="dock" size={16} />
            </TooltipTrigger>
            <TooltipContent>Toggle dock</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="More"
                        className="text-muted-foreground"
                      />
                    }
                  />
                }
              >
                <RibbonIcon name="more" size={16} />
              </TooltipTrigger>
              <TooltipContent>More</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem>New agent</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Shortcuts</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 gap-px bg-border",
            space.split === "column" ? "flex-col" : "flex-row",
          )}
        >
          {space.paneIds.map((id) => (
            <Pane
              key={id}
              agent={agentById(id)}
              focused={id === focused.id}
              onFocus={() => focus(id)}
            />
          ))}
        </main>
        {dockOpen.value ? <AgentDock agent={focused} onFocus={focus} /> : null}
      </div>
    </div>
  );
}
