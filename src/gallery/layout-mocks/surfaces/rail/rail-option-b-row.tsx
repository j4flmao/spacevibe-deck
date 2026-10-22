import { HugeiconsIcon } from "@hugeicons/react";
import {
  Archive02Icon,
  MoreHorizontalIcon,
  PinIcon,
  UnavailableIcon,
} from "@hugeicons/core-free-icons";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { cn } from "cn";
import { Button } from "../../../../ui/controls/button";
import { DropdownMenu, DropdownMenuTrigger } from "../../../../ui/controls/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../../../ui/controls/hover-card";
import { Input } from "../../../../ui/controls/input";
import { AgentLogo, AgentStateMark } from "../../agent-parts";
import { AGENT_NAME, PROJECTS, STATE_LABEL } from "../../layout-fixture";
import { RowMenuContent } from "./rail-option-b-menu";
import { displayTitle, type RailAgent } from "./rail-option-b-model";
import { Tip, focusRow } from "./rail-option-b-parts";
import type { RailState } from "./rail-option-b-state";

function projectName(agent: RailAgent): string {
  return PROJECTS.find((item) => item.id === agent.projectId)?.name ?? agent.projectId;
}

function detailLine(agent: RailAgent, withProject: boolean): string {
  if (agent.state === "needs-you" && agent.ask !== null) return agent.ask;
  const place = withProject
    ? [projectName(agent), agent.branch].filter(Boolean).join(" / ")
    : (agent.branch ?? "No branch");
  return agent.state === "idle" ? `${STATE_LABEL.idle} · ${place}` : place;
}

function Facts({ agent }: { readonly agent: RailAgent }) {
  const facts: readonly (readonly [string, string])[] = [
    ["Branch", agent.branch ?? "None"],
    ["Project", projectName(agent)],
    ["Tokens", agent.tokens],
    ["Cost", agent.cost],
    ["In state", `${STATE_LABEL[agent.state]} · ${agent.since}`],
  ];
  return (
    <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
      {facts.map(([name, value]) => (
        <>
          <dt className="text-muted-foreground">{name}</dt>
          <dd className="m-0 truncate text-foreground tabular-nums">{value}</dd>
        </>
      ))}
    </dl>
  );
}

function Rename({ s, agent, fallback }: { s: RailState; agent: RailAgent; fallback: string }) {
  const done = useSignal(false);
  const finish = (value: string | null) => {
    if (done.value) return;
    done.value = true;
    if (value !== null) s.patch(agent.id, { label: value.trim() === "" ? null : value.trim() });
    s.editing.value = null;
    focusRow(agent.id);
  };
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    box.current?.querySelector("input")?.focus();
  }, []);
  return (
    <span ref={box} className="flex min-w-0 flex-1">
      <Input
        aria-label="Rename"
        defaultValue={displayTitle(agent, fallback)}
        className="h-[18px] min-w-0 flex-1 px-1 py-0 text-[13px]"
        onFocus={(event: FocusEvent) => (event.currentTarget as HTMLInputElement).select()}
        onClick={(event: MouseEvent) => event.stopPropagation()}
        onDblClick={(event: MouseEvent) => event.stopPropagation()}
        onBlur={(event: FocusEvent) => finish((event.currentTarget as HTMLInputElement).value)}
        onKeyDown={(event: KeyboardEvent) => {
          event.stopPropagation();
          if (event.key === "Enter") finish((event.currentTarget as HTMLInputElement).value);
          if (event.key === "Escape") finish(null);
        }}
      />
    </span>
  );
}

const ACTION = "size-5 text-muted-foreground hover:text-foreground";

export function AgentRow({
  s,
  agent,
  withProject,
  selected,
  tabbable,
  onSelect,
}: {
  readonly s: RailState;
  readonly agent: RailAgent;
  readonly withProject: boolean;
  readonly selected: boolean;
  readonly tabbable: boolean;
  readonly onSelect: (id: string) => void;
}) {
  const hover = useSignal(false);
  const fallback = AGENT_NAME[agent.kind];
  const title = displayTitle(agent, fallback);
  const editing = s.editing.value === agent.id;
  const menuOpen = s.menuFor.value === agent.id;
  const note = s.flash.value?.id === agent.id ? s.flash.value.text : null;
  const asking = agent.state === "needs-you" && agent.ask !== null;
  return (
    <HoverCard
      open={hover.value && !editing && !menuOpen}
      onOpenChange={(open: boolean) => {
        hover.value = open;
      }}
    >
      <div className="group relative mx-1.5">
        <HoverCardTrigger
          delay={450}
          render={
            <div
              role="button"
              data-nav=""
              data-row={agent.id}
              tabIndex={tabbable ? 0 : -1}
              aria-current={selected ? "true" : undefined}
              aria-label={`${fallback}, ${STATE_LABEL[agent.state]}${agent.sentence ? `: ${agent.sentence}` : ""}, ${agent.since}`}
              onClick={() => onSelect(agent.id)}
              onFocus={() => {
                s.stop.value = agent.id;
              }}
              onDblClick={() => {
                s.editing.value = agent.id;
              }}
              onContextMenu={(event: MouseEvent) => {
                event.preventDefault();
                s.menuFor.value = agent.id;
              }}
              onKeyDown={(event: KeyboardEvent) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "Enter") onSelect(agent.id);
                if (event.key === "F2") s.editing.value = agent.id;
              }}
              className={cn(
                "grid w-full cursor-default grid-cols-[10px_16px_minmax(0,1fr)_auto] gap-x-2 rounded-md px-2.5 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "bg-accent ring-1 ring-ring/40 ring-inset" : "hover:bg-accent/50",
                agent.archived && "opacity-70",
              )}
            />
          }
        >
          <span className="flex h-[18px] items-center">
            <AgentStateMark state={agent.state} confidence={agent.confidence} />
          </span>
          <span className="flex h-[18px] items-center">
            <AgentLogo kind={agent.kind} />
          </span>
          {editing ? (
            <Rename s={s} agent={agent} fallback={fallback} />
          ) : (
            <span
              className={cn(
                "truncate text-[13px] leading-[18px] text-foreground",
                selected && "font-medium",
              )}
            >
              {title}
            </span>
          )}
          <span className="flex items-center gap-1 text-right text-[11px] leading-[18px] text-muted-foreground tabular-nums">
            {agent.pinned ? (
              <HugeiconsIcon
                icon={PinIcon}
                size={11}
                strokeWidth={2}
                aria-label="Pinned"
                className="group-hover:invisible"
              />
            ) : null}
            <span className="group-focus-within:invisible group-hover:invisible">
              {note ?? agent.since}
            </span>
          </span>
          <span
            className={cn(
              "col-span-2 col-start-3 truncate text-[11px] leading-4",
              asking || selected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {detailLine(agent, withProject)}
          </span>
        </HoverCardTrigger>
        <div
          className={cn(
            "absolute top-1.5 right-1.5 hidden items-center gap-0.5 rounded-md bg-accent group-focus-within:flex group-hover:flex",
            editing && "hidden! group-focus-within:hidden! group-hover:hidden!",
            menuOpen && "flex",
          )}
        >
          {agent.archived ? (
            <Tip label="Unarchive" onPress={() => s.patch(agent.id, { archived: false })}>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Unarchive"
                className={ACTION}
                onClick={(event: MouseEvent) => event.stopPropagation()}
              >
                <HugeiconsIcon icon={UnavailableIcon} strokeWidth={2} aria-hidden="true" />
              </Button>
            </Tip>
          ) : (
            <>
              <Tip label={agent.pinned ? "Unpin" : "Pin"}>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={agent.pinned ? "Unpin" : "Pin"}
                  aria-pressed={agent.pinned}
                  className={cn(ACTION, agent.pinned && "text-foreground")}
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation();
                    s.patch(agent.id, { pinned: !agent.pinned });
                  }}
                >
                  <HugeiconsIcon icon={PinIcon} strokeWidth={2} aria-hidden="true" />
                </Button>
              </Tip>
              <Tip label="Archive" onPress={() => s.patch(agent.id, { archived: true })}>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Archive"
                  className={ACTION}
                  onClick={(event: MouseEvent) => event.stopPropagation()}
                >
                  <HugeiconsIcon icon={Archive02Icon} strokeWidth={2} aria-hidden="true" />
                </Button>
              </Tip>
            </>
          )}
          <DropdownMenu
            open={menuOpen}
            onOpenChange={(open: boolean) => {
              s.menuFor.value = open ? agent.id : null;
            }}
          >
            <Tip label="More">
              <span className="inline-flex">
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="More"
                      className={ACTION}
                      onClick={(event: MouseEvent) => event.stopPropagation()}
                    />
                  }
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} aria-hidden="true" />
                </DropdownMenuTrigger>
              </span>
            </Tip>
            <RowMenuContent s={s} agent={agent} />
          </DropdownMenu>
        </div>
      </div>
      <HoverCardContent side="right" align="start" className="flex flex-col gap-2">
        <p className="m-0 text-xs/relaxed text-foreground">
          {agent.sentence ?? STATE_LABEL.idle}
          {asking ? <span className="block text-muted-foreground">{agent.ask}</span> : null}
        </p>
        <Facts agent={agent} />
      </HoverCardContent>
    </HoverCard>
  );
}
