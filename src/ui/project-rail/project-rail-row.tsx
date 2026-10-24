import { Folder, GitBranch, TerminalWindow } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { AgentGlyph } from "../controls/agent-glyph";
import { CHROME_ICON, DeckIcon } from "../controls/deck-icon";
import { AgentStateMark } from "../blocks/agent-state-mark";
import { displayAgent } from "../agent-rail-card-model";
import { formatShortAge } from "../agent-rail-model";
import type { RailItem } from "../rail-view-model";
import { isRailItemFocused, statusLabel } from "./project-rail-model";
import { railNow } from "./project-rail-state";

/** Time in the current state. Its own component so a clock tick wakes this text and no row. */
function StateAge({ changedAt }: { readonly changedAt: number }) {
  return <>{formatShortAge(changedAt, railNow.value)}</>;
}

export interface ProjectRailRowProps {
  readonly item: RailItem;
  /** The one row of the list Tab reaches; arrow keys move between the others. */
  readonly tabStop: boolean;
  readonly onSelect: () => void;
}

/** Two lines (LAY-2): the state and the title, then the agent, branch chip and time in state. */
export function ProjectRailRow({ item, tabStop, onSelect }: ProjectRailRowProps) {
  const focused = isRailItemFocused(item);
  const { entry } = item;
  return (
    <div className="group/item relative mx-1.5">
      {/* raw-control: a whole-row click target; no Button variant spans a two-line row */}
      <button
        type="button"
        data-rail-row={item.id}
        tabIndex={tabStop ? 0 : -1}
        aria-current={focused ? "true" : undefined}
        onClick={onSelect}
        className={cn(
          "grid w-full cursor-default grid-cols-[10px_minmax(0,1fr)] gap-x-2 gap-y-0.5 rounded-md px-2.5 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          focused ? "bg-accent ring-1 ring-ring/40 ring-inset" : "hover:bg-accent/50",
        )}
      >
        <span className="flex h-[18px] items-center">
          <AgentStateMark status={item.status} confidence={item.confidence} />
        </span>
        <span
          className={cn(
            "truncate text-sm leading-[18px] text-foreground",
            focused && "font-medium",
          )}
        >
          {item.title}
        </span>
        <span className="col-start-2 flex min-w-0 items-center gap-1.5 text-2xs leading-4 text-muted-foreground">
          {entry.kind === "agent" ? (
            <AgentGlyph agent={entry.agent} className="size-3 shrink-0" />
          ) : (
            <DeckIcon icon={TerminalWindow} size={CHROME_ICON} class="size-3 shrink-0" />
          )}
          <span className="inline-flex min-w-0 items-center gap-1 rounded-sm bg-muted px-1.5">
            <DeckIcon
              icon={item.checkout.labelled ? GitBranch : Folder}
              size={CHROME_ICON}
              class="size-2.5 shrink-0"
            />
            <span className="truncate">{item.branch}</span>
          </span>
          <span className="ml-auto shrink-0 tabular-nums">
            <StateAge changedAt={item.changedAt} />
          </span>
        </span>
        <span className="sr-only">
          {entry.kind === "agent" ? `${displayAgent(entry.agent)}, ` : "shell, "}
          {statusLabel(item)}
        </span>
      </button>
    </div>
  );
}
