import { HugeiconsIcon } from "@hugeicons/react";
import {
  Archive02Icon,
  DragDropVerticalIcon,
  MoreHorizontalIcon,
  PinIcon,
  PinOffIcon,
} from "@hugeicons/core-free-icons";
import { useSignal } from "@preact/signals";
import { cn } from "cn";
import { Button } from "../../../../ui/controls/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../../../../ui/controls/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../../../ui/controls/hover-card";
import { Input } from "../../../../ui/controls/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/controls/tooltip";
import { AGENT_NAME, STATE_LABEL, placeOf } from "../../layout-fixture";
import { AgentStateMark } from "../../agent-parts";
import {
  focusList,
  moveItem,
  nudgeItem,
  patch,
  shownState,
  titleOf,
  type RailD,
  type RailItem,
} from "./rail-option-d-state";

function copy(text: string) {
  void navigator.clipboard?.writeText(text).catch(() => undefined);
}

/** A name edited in place: Enter or blur commits, Esc cancels, empty restores. */
export function InlineName({
  value,
  label,
  onDone,
}: {
  readonly value: string;
  readonly label: string;
  readonly onDone: (next: string | null) => void;
}) {
  return (
    <Input
      autoFocus
      defaultValue={value}
      aria-label={label}
      className="h-5 px-1 text-[13px]"
      onFocus={(event: FocusEvent) => (event.currentTarget as HTMLInputElement).select()}
      onBlur={(event: FocusEvent) => onDone((event.currentTarget as HTMLInputElement).value)}
      onKeyDown={(event: KeyboardEvent) => {
        event.stopPropagation();
        if (event.key === "Enter") onDone((event.currentTarget as HTMLInputElement).value);
        else if (event.key === "Escape") onDone(null);
      }}
    />
  );
}

export function RowMenuItems({ s, item }: { readonly s: RailD; readonly item: RailItem }) {
  const id = item.agent.id;
  const { checkout } = placeOf(item.agent);
  const unread = shownState(item) === "unchecked";
  return (
    <>
      <DropdownMenuItem
        onClick={() => {
          s.editing.value = id;
        }}
      >
        Rename
        <DropdownMenuShortcut>F2</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => patch(s, id, { pinned: !item.pinned })}>
        {item.pinned ? "Unpin" : "Pin"}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => patch(s, id, { read: unread })}>
        {unread ? "Mark read" : "Mark unread"}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => copy(checkout.path)}>Copy path</DropdownMenuItem>
      <DropdownMenuItem
        disabled={checkout.branch === null}
        onClick={() => copy(checkout.branch ?? "")}
      >
        Copy branch
      </DropdownMenuItem>
      <DropdownMenuItem>Open in Finder</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => nudgeItem(s, id, -1)}>Move up</DropdownMenuItem>
      <DropdownMenuItem onClick={() => nudgeItem(s, id, 1)}>Move down</DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Move to group</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {s.groups.value.map((group) => (
            <DropdownMenuItem
              key={group.id}
              disabled={group.id === item.group}
              onClick={() => moveItem(s, id, null, group.id)}
            >
              {group.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => patch(s, id, { archived: true })}>Archive</DropdownMenuItem>
    </>
  );
}

function Details({ item }: { readonly item: RailItem }) {
  const { checkout, project } = placeOf(item.agent);
  const agent = item.agent;
  return (
    <div className="grid gap-1.5">
      <p className="m-0 font-medium text-foreground">{titleOf(item)}</p>
      <p className="m-0 text-muted-foreground">
        {project.name}
        {checkout.branch ? ` / ${checkout.branch}` : ""}
        {checkout.pr ? ` · PR #${checkout.pr.number} ${checkout.pr.state}` : ""}
      </p>
      {agent.ask ? <p className="m-0 text-foreground">{agent.ask}</p> : null}
      {agent.sentence && agent.sentence !== titleOf(item) ? (
        <p className="m-0 text-muted-foreground">{agent.sentence}</p>
      ) : null}
      <p className="m-0 flex items-center gap-1.5 text-muted-foreground tabular-nums">
        <AgentStateMark state={shownState(item)} confidence={agent.confidence} />
        {AGENT_NAME[agent.kind]} · {STATE_LABEL[shownState(item)]}
        {agent.confidence === "inferred" ? " (inferred)" : ""} · {agent.since} · {agent.tokens} ·{" "}
        {agent.cost}
      </p>
    </div>
  );
}

export function CompactRow({
  s,
  item,
  selected,
  tab,
  onPick,
}: {
  readonly s: RailD;
  readonly item: RailItem;
  readonly selected: boolean;
  readonly tab: boolean;
  readonly onPick: (id: string) => void;
}) {
  const id = item.agent.id;
  const menu = useSignal(false);
  const editing = s.editing.value === id;
  const title = titleOf(item);
  const state = shownState(item);
  const finish = (next: string | null) => {
    if (s.editing.value !== id) return;
    s.editing.value = null;
    focusList();
    if (next !== null) patch(s, id, { name: next.trim() === "" ? null : next.trim() });
  };
  const shell = cn(
    "flex h-7 w-full items-center gap-2 rounded-md px-3.5 text-left outline-none",
    selected ? "bg-accent ring-1 ring-ring/40 ring-inset" : "hover:bg-accent",
    s.dragId.value === id && "opacity-50",
  );
  const body = (
    <>
      <AgentStateMark state={state} confidence={item.agent.confidence} />
      {editing ? (
        <InlineName value={title} label="Rename session" onDone={finish} />
      ) : (
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[13px] leading-5",
            selected || state === "needs-you" || state === "failed"
              ? "font-medium text-foreground"
              : "text-foreground/85",
          )}
        >
          {title}
        </span>
      )}
      {editing ? null : (
        <span
          className={cn(
            "shrink-0 text-[11px] tabular-nums text-muted-foreground group-focus-within:invisible group-hover:invisible",
            menu.value && "invisible",
          )}
        >
          {item.agent.since}
        </span>
      )}
    </>
  );
  return (
    <div
      className="group relative mx-1.5"
      onContextMenu={(event) => {
        event.preventDefault();
        menu.value = true;
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (s.dragId.value) moveItem(s, s.dragId.value, id);
        s.dragId.value = null;
      }}
    >
      {editing ? (
        <div className={cn(shell, "ring-2 ring-ring")}>{body}</div>
      ) : (
        <HoverCard>
          <HoverCardTrigger
            delay={500}
            render={
              <button
                type="button"
                data-rail-item
                draggable
                tabIndex={tab ? 0 : -1}
                aria-current={selected ? "true" : undefined}
                aria-label={`${title}, ${AGENT_NAME[item.agent.kind]}, ${STATE_LABEL[state]}, ${item.agent.since}`}
                className={cn(shell, "cursor-default focus-visible:ring-2 focus-visible:ring-ring")}
                onClick={() => onPick(id)}
                onDblClick={() => {
                  s.editing.value = id;
                }}
                onDragStart={() => {
                  s.dragId.value = id;
                }}
                onDragEnd={() => {
                  s.dragId.value = null;
                }}
                onKeyDown={(event: KeyboardEvent) => {
                  if (event.key === "F2") {
                    event.preventDefault();
                    s.editing.value = id;
                  }
                }}
              />
            }
          >
            {body}
          </HoverCardTrigger>
          <HoverCardContent side="right" align="start" className="w-80">
            <Details item={item} />
          </HoverCardContent>
        </HoverCard>
      )}
      <HugeiconsIcon
        icon={DragDropVerticalIcon}
        strokeWidth={2}
        aria-hidden="true"
        className="pointer-events-none absolute top-2 left-1 size-3 text-muted-foreground opacity-0 group-hover:opacity-70"
      />
      <div
        className={cn(
          "absolute top-1 right-1.5 flex items-center gap-0.5 rounded-md bg-accent pl-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
          menu.value && "opacity-100",
          editing && "hidden",
        )}
      >
        <RowAction
          label={item.pinned ? "Unpin" : "Pin"}
          icon={item.pinned ? PinOffIcon : PinIcon}
          onClick={() => patch(s, id, { pinned: !item.pinned })}
        />
        <RowAction
          label="Archive"
          icon={Archive02Icon}
          onClick={() => patch(s, id, { archived: true })}
        />
        <DropdownMenu
          open={menu.value}
          onOpenChange={(next: boolean) => {
            menu.value = next;
          }}
        >
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                tabIndex={-1}
                aria-label={`Actions for ${title}`}
              />
            }
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <RowMenuItems s={s} item={item} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function RowAction({
  label,
  icon,
  onClick,
}: {
  readonly label: string;
  readonly icon: typeof PinIcon;
  readonly onClick: () => void;
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
        <HugeiconsIcon icon={icon} strokeWidth={2} aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
