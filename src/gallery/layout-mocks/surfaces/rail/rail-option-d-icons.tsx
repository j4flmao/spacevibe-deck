import { HugeiconsIcon } from "@hugeicons/react";
import { SidebarLeftIcon } from "@hugeicons/core-free-icons";
import { cn } from "cn";
import { ScrollArea } from "../../../../ui/controls/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/controls/tooltip";
import { AGENT_NAME, STATE_LABEL, placeOf } from "../../layout-fixture";
import { AgentLogo, AgentStateMark } from "../../agent-parts";
import { CreateMenu, TipButton, ToolsMenu } from "./rail-option-d-controls";
import {
  iconOrder,
  liveItems,
  rovingKeys,
  shownState,
  titleOf,
  type RailD,
  type RailItem,
} from "./rail-option-d-state";

function IconRow({
  item,
  selected,
  tab,
  onPick,
}: {
  readonly item: RailItem;
  readonly selected: boolean;
  readonly tab: boolean;
  readonly onPick: (id: string) => void;
}) {
  const state = shownState(item);
  const { project } = placeOf(item.agent);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            data-rail-item
            tabIndex={tab ? 0 : -1}
            aria-current={selected ? "true" : undefined}
            aria-label={`${titleOf(item)}, ${AGENT_NAME[item.agent.kind]}, ${STATE_LABEL[state]}`}
            className={cn(
              "relative flex size-9 shrink-0 cursor-default items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "bg-accent ring-1 ring-ring/40 ring-inset" : "hover:bg-accent/50",
            )}
            onClick={() => onPick(item.agent.id)}
          />
        }
      >
        <AgentLogo kind={item.agent.kind} className="size-5" />
        <span className="absolute right-0.5 bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-sidebar">
          <AgentStateMark state={state} confidence={item.agent.confidence} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex-col items-start gap-0.5">
        <span className="font-medium">{titleOf(item)}</span>
        <span className="opacity-70">
          {STATE_LABEL[state]} · {project.name} · {item.agent.since}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/** The same panel at 52px: one logo per agent, needs-you first, + and Tools at the bottom. */
export function IconRail({
  s,
  focusId,
  onPick,
}: {
  readonly s: RailD;
  readonly focusId: string;
  readonly onPick: (id: string) => void;
}) {
  const rows = iconOrder(liveItems(s));
  const selectedId = s.picked.value ?? focusId;
  const tabId = rows.some((item) => item.agent.id === selectedId) ? selectedId : rows[0]?.agent.id;
  return (
    <div className="flex h-full w-[52px] shrink-0 flex-col items-center border-r border-sidebar-border">
      <div className="flex h-11 shrink-0 items-center">
        <TipButton
          label="Expand"
          keys={["⌘", "B"]}
          side="right"
          onClick={() => {
            s.collapsed.value = false;
          }}
        >
          <HugeiconsIcon icon={SidebarLeftIcon} strokeWidth={2} aria-hidden="true" />
        </TipButton>
      </div>
      <ScrollArea className="min-h-0 w-full flex-1">
        <nav
          aria-label="Sessions"
          className="flex flex-col items-center gap-1 px-1 py-1"
          onKeyDown={(event) => rovingKeys(event, event.currentTarget)}
        >
          {rows.map((item) => (
            <IconRow
              key={item.agent.id}
              item={item}
              selected={item.agent.id === selectedId}
              tab={item.agent.id === tabId}
              onPick={onPick}
            />
          ))}
        </nav>
      </ScrollArea>
      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-sidebar-border py-2">
        <CreateMenu s={s} side="right" />
        <ToolsMenu side="right" />
      </div>
    </div>
  );
}
