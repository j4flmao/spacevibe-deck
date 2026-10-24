import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { CHROME_ICON, DeckIcon } from "../controls/deck-icon";
import { AgentStateMark } from "../blocks/agent-state-mark";
import type { RailGroup } from "../rail-view-model";
import { projectInitials, statusLabel } from "./project-rail-model";

export interface ProjectRailHeaderProps {
  readonly group: RailGroup;
  readonly folded: boolean;
  readonly onToggle: () => void;
}

/**
 * One project's header (LAY-1): its initials, name and fold chevron. A FOLDED project
 * speaks with its loudest agent and its count; an open one shows its rows instead.
 */
export function ProjectRailHeader({ group, folded, onToggle }: ProjectRailHeaderProps) {
  const { rollup, count } = group;
  const sessions = `${count} ${count === 1 ? "session" : "sessions"}`;
  return (
    <div className="group/item relative mx-1.5 mt-1">
      {/* raw-control: a whole-row disclosure target; no Button variant spans a header row */}
      <button
        type="button"
        data-rail-project={group.key}
        aria-expanded={!folded}
        onClick={onToggle}
        className="flex h-8 w-full cursor-default items-center gap-2 rounded-md px-2 text-left outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-3xs font-semibold text-muted-foreground"
        >
          {projectInitials(group.label)}
        </span>
        <span className="min-w-0 truncate text-sm font-medium text-foreground">{group.label}</span>
        <DeckIcon
          icon={CaretDown}
          size={CHROME_ICON}
          class={cn(
            "size-2.5 shrink-0 text-muted-foreground transition-transform",
            folded && "-rotate-90",
          )}
        />
        {folded ? (
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-2xs text-muted-foreground tabular-nums">
            {rollup === null ? null : (
              <AgentStateMark status={rollup.status} confidence={rollup.confidence} />
            )}
            <span aria-hidden="true">{count}</span>
          </span>
        ) : null}
        <span className="sr-only">
          {sessions}
          {folded && rollup !== null ? `, ${statusLabel(rollup)}` : ""}
        </span>
      </button>
    </div>
  );
}
