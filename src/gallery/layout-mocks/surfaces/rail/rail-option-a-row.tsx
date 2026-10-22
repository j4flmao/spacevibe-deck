import { HugeiconsIcon } from "@hugeicons/react";
import {
  Archive02Icon,
  ArchiveRestoreIcon,
  MoreHorizontalIcon,
  PinIcon,
  PinOffIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "cn";
import { Button } from "../../../../ui/controls/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../ui/controls/dropdown-menu";
import { Input } from "../../../../ui/controls/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/controls/tooltip";
import { AgentLogo, AgentStateMark } from "../../agent-parts";
import { AGENT_NAME, STATE_LABEL } from "../../layout-fixture";
import type { FlatRow } from "./rail-option-a-model";

export type RowAction =
  | "rename"
  | "pin"
  | "toggle-read"
  | "copy-path"
  | "copy-branch"
  | "finder"
  | "archive"
  | "unarchive";

interface RowProps {
  readonly row: FlatRow;
  readonly selected: boolean;
  readonly tabStop: boolean;
  readonly renaming: boolean;
  readonly menuOpen: boolean;
  readonly onSelect: () => void;
  /** `null` cancels; an empty string clears the name. */
  readonly onRenameEnd: (value: string | null) => void;
  readonly onMenuOpenChange: (open: boolean) => void;
  readonly onAction: (action: RowAction) => void;
}

export function rowTitle(row: FlatRow): string {
  return row.label ?? row.agent.sentence ?? AGENT_NAME[row.agent.kind];
}

function HoverButton({
  label,
  onClick,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly children: preact.ComponentChildren;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            tabIndex={-1}
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function RowMenu({ row, onAction }: Pick<RowProps, "row" | "onAction">) {
  const unread = row.agent.state === "unchecked";
  const items: readonly (readonly [RowAction, string, boolean?])[] = [
    ["rename", "Rename"],
    ["pin", row.pinned ? "Unpin" : "Pin"],
    ["toggle-read", unread ? "Mark read" : "Mark unread"],
  ];
  return (
    <DropdownMenuContent align="end" className="min-w-44">
      {items.map(([action, label]) => (
        <DropdownMenuItem key={action} onClick={() => onAction(action)}>
          {label}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onAction("copy-path")}>Copy path</DropdownMenuItem>
      <DropdownMenuItem disabled={row.branch === null} onClick={() => onAction("copy-branch")}>
        Copy branch
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onAction("finder")}>Open in Finder</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onAction(row.archived ? "unarchive" : "archive")}>
        {row.archived ? "Unarchive" : "Archive"}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

export function FlatRowItem(props: RowProps) {
  const { row, selected, tabStop, renaming, menuOpen } = props;
  const { agent } = row;
  const asking = agent.state === "needs-you" && agent.ask !== null;
  const title = rowTitle(row);
  const marks = (
    <>
      <span className="flex h-[18px] items-center">
        <AgentStateMark state={agent.state} confidence={agent.confidence} />
      </span>
      <span className="flex h-[18px] items-center">
        <AgentLogo kind={agent.kind} />
      </span>
    </>
  );
  const grid =
    "grid w-full grid-cols-[10px_16px_minmax(0,1fr)] gap-x-2 rounded-md px-2.5 py-1.5 text-left";

  if (renaming) {
    return (
      <div className="mx-1.5" data-row-id={row.id}>
        <div className={cn(grid, "bg-accent/50")}>
          {marks}
          <Input
            autoFocus
            defaultValue={row.label ?? title}
            aria-label="Rename"
            className="h-[22px] text-[13px]"
            onFocus={(event) => event.currentTarget.select()}
            onBlur={(event) => props.onRenameEnd(event.currentTarget.value.trim())}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") event.currentTarget.blur();
              else if (event.key === "Escape") props.onRenameEnd(null);
            }}
          />
        </div>
      </div>
    );
  }

  const reveal = cn(
    "opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100",
    menuOpen && "opacity-100",
  );
  return (
    <div
      className="group/row relative mx-1.5"
      data-row-id={row.id}
      onContextMenu={(event) => {
        event.preventDefault();
        props.onMenuOpenChange(true);
      }}
    >
      <button
        type="button"
        data-rail-row=""
        tabIndex={tabStop ? 0 : -1}
        onClick={props.onSelect}
        onDblClick={() => props.onAction("rename")}
        onKeyDown={(event) => {
          if (event.key === "F2") {
            event.preventDefault();
            props.onAction("rename");
          }
        }}
        aria-current={selected ? "true" : undefined}
        aria-label={`${AGENT_NAME[agent.kind]}, ${STATE_LABEL[agent.state]}: ${title}, ${row.project.name}${row.branch ? ` / ${row.branch}` : ""}, ${agent.since}`}
        className={cn(
          grid,
          "cursor-default outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          selected ? "bg-accent ring-1 ring-ring/40 ring-inset" : "hover:bg-accent/50",
          row.archived && "opacity-70",
        )}
      >
        {marks}
        <span
          className={cn(
            "truncate text-[13px] leading-[18px] text-foreground",
            selected && "font-medium",
          )}
        >
          {title}
        </span>
        <span className="col-span-2 col-start-3 mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-4">
          {asking ? (
            <span className="min-w-0 flex-1 truncate text-foreground">{agent.ask}</span>
          ) : (
            <>
              <span className="max-w-[45%] shrink-0 truncate rounded-sm bg-muted px-1 text-[10px] leading-4 text-muted-foreground">
                {row.project.name}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {row.branch ?? ""}
              </span>
            </>
          )}
          <span className="shrink-0 tabular-nums text-muted-foreground">{agent.since}</span>
        </span>
      </button>
      <div
        className={cn(
          "absolute top-1 right-1.5 flex items-center rounded-md bg-accent px-0.5 shadow-sm",
          reveal,
        )}
      >
        {row.archived ? (
          <HoverButton label="Unarchive" onClick={() => props.onAction("unarchive")}>
            <HugeiconsIcon icon={ArchiveRestoreIcon} strokeWidth={2} aria-hidden="true" />
          </HoverButton>
        ) : (
          <>
            <HoverButton label={row.pinned ? "Unpin" : "Pin"} onClick={() => props.onAction("pin")}>
              <HugeiconsIcon
                icon={row.pinned ? PinOffIcon : PinIcon}
                strokeWidth={2}
                aria-hidden="true"
              />
            </HoverButton>
            <HoverButton label="Archive" onClick={() => props.onAction("archive")}>
              <HugeiconsIcon icon={Archive02Icon} strokeWidth={2} aria-hidden="true" />
            </HoverButton>
          </>
        )}
        <DropdownMenu open={menuOpen} onOpenChange={props.onMenuOpenChange}>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-xs" tabIndex={-1} aria-label="More actions" />
                }
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} aria-hidden="true" />
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>More</TooltipContent>
          </Tooltip>
          <RowMenu row={row} onAction={props.onAction} />
        </DropdownMenu>
      </div>
    </div>
  );
}
