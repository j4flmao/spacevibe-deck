import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArchiveRestoreIcon,
  ArrowDown01Icon,
  MoreHorizontalIcon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "cn";
import { Badge } from "../../../../ui/controls/badge";
import { Button } from "../../../../ui/controls/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../ui/controls/dropdown-menu";
import { Input } from "../../../../ui/controls/input";
import { ScrollArea } from "../../../../ui/controls/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/controls/tooltip";
import { loudest } from "../../layout-fixture";
import { AgentStateMark } from "../../agent-parts";
import { DockIcon } from "../dock/dock-parts";
import { CreateMenu, TipButton, ToolsMenu } from "./rail-option-d-controls";
import { CompactRow, InlineName, RowAction } from "./rail-option-d-row";
import {
  archivedItems,
  attentionCount,
  deleteGroup,
  focusList,
  liveItems,
  nudgeGroup,
  patch,
  patchGroup,
  rovingKeys,
  shownState,
  titleOf,
  moveItem,
  type RailD,
  type RailGroup,
  type RailItem,
} from "./rail-option-d-state";

const SECTION_BUTTON =
  "flex h-7 w-full items-center gap-1.5 rounded-md px-3 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring";

function Chevron({ open }: { readonly open: boolean }) {
  return (
    <HugeiconsIcon
      icon={ArrowDown01Icon}
      strokeWidth={2}
      aria-hidden="true"
      className={cn("size-3 shrink-0 transition-transform", !open && "-rotate-90")}
    />
  );
}

function GroupHeader({
  s,
  group,
  rows,
  open,
}: {
  readonly s: RailD;
  readonly group: RailGroup;
  readonly rows: readonly RailItem[];
  readonly open: boolean;
}) {
  const editing = s.editing.value === group.id;
  const finish = (next: string | null) => {
    if (s.editing.value !== group.id) return;
    s.editing.value = null;
    focusList();
    if (next !== null && next.trim() !== "") patchGroup(s, group.id, { name: next.trim() });
  };
  return (
    <div
      className="group relative mx-1.5 mt-1"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (s.dragId.value) moveItem(s, s.dragId.value, null, group.id);
        s.dragId.value = null;
      }}
    >
      {editing ? (
        <div className={cn(SECTION_BUTTON, "ring-2 ring-ring")}>
          <InlineName value={group.name} label="Rename group" onDone={finish} />
        </div>
      ) : (
        <button
          type="button"
          data-rail-item
          aria-expanded={open}
          className={SECTION_BUTTON}
          onClick={() => patchGroup(s, group.id, { folded: open })}
          onDblClick={() => {
            s.editing.value = group.id;
          }}
        >
          <Chevron open={open} />
          <span className="min-w-0 flex-1 truncate">{group.name}</span>
          {open ? null : rows.length > 0 ? (
            <AgentStateMark state={loudest(rows.map(shownState))} />
          ) : null}
          <span className="tabular-nums group-focus-within:invisible group-hover:invisible">
            {rows.length}
          </span>
        </button>
      )}
      <div
        className={cn(
          "absolute top-1 right-1.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
          editing && "hidden",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                tabIndex={-1}
                aria-label={`Actions for ${group.name}`}
              />
            }
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem
              onClick={() => {
                s.editing.value = group.id;
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => nudgeGroup(s, group.id, -1)}>Move up</DropdownMenuItem>
            <DropdownMenuItem onClick={() => nudgeGroup(s, group.id, 1)}>
              Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={s.groups.value.length < 2}
              onClick={() => deleteGroup(s, group.id)}
            >
              Delete group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ArchivedRow({ s, item }: { readonly s: RailD; readonly item: RailItem }) {
  return (
    <div className="group relative mx-1.5">
      <div className="flex h-7 items-center gap-2 rounded-md px-3.5 text-muted-foreground">
        <AgentStateMark state={shownState(item)} confidence={item.agent.confidence} />
        <span className="min-w-0 flex-1 truncate text-[13px]">{titleOf(item)}</span>
      </div>
      <div className="absolute top-1 right-1.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
        <RowAction
          label="Unarchive"
          icon={ArchiveRestoreIcon}
          onClick={() => patch(s, item.agent.id, { archived: false })}
        />
      </div>
    </div>
  );
}

export function ExpandedRail({
  s,
  focusId,
  onPick,
}: {
  readonly s: RailD;
  readonly focusId: string;
  readonly onPick: (id: string) => void;
}) {
  const live = liveItems(s);
  const archived = archivedItems(s);
  const searching = s.query.value.trim() !== "";
  const selectedId = s.picked.value ?? focusId;
  const pinned = live.filter((item) => item.pinned);
  const sections = s.groups.value.map((group) => {
    const rows = live.filter((item) => !item.pinned && item.group === group.id);
    return { group, rows, open: searching || !group.folded };
  });
  const visible = [...pinned, ...sections.filter((x) => x.open).flatMap((x) => x.rows)];
  const tabId = visible.some((item) => item.agent.id === selectedId)
    ? selectedId
    : visible[0]?.agent.id;
  const row = (item: RailItem) => (
    <CompactRow
      key={item.agent.id}
      s={s}
      item={item}
      selected={item.agent.id === selectedId}
      tab={item.agent.id === tabId}
      onPick={onPick}
    />
  );
  const attention = attentionCount(s);
  return (
    <div className="flex h-full w-[300px] min-w-0 flex-col">
      <header className="flex h-11 shrink-0 items-center gap-1 px-2">
        <TipButton
          label="Collapse"
          keys={["⌘", "B"]}
          onClick={() => {
            s.collapsed.value = true;
          }}
        >
          <HugeiconsIcon icon={SidebarLeftIcon} strokeWidth={2} aria-hidden="true" />
        </TipButton>
        <Input
          data-rail-search
          aria-label="Search sessions"
          placeholder="Search  /"
          value={s.query.value}
          onInput={(event: Event) => {
            s.query.value = (event.currentTarget as HTMLInputElement).value;
          }}
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            if (s.query.value !== "") s.query.value = "";
            else
              (event.currentTarget as HTMLElement)
                .closest("[data-rail-d]")
                ?.querySelector<HTMLElement>('[data-rail-item][tabindex="0"]')
                ?.focus();
          }}
        />
        <CreateMenu s={s} />
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Sessions" onKeyDown={(event) => rovingKeys(event, event.currentTarget)}>
          {live.length === 0 && archived.length === 0 ? (
            <p className="m-0 px-4 py-8 text-center text-xs text-muted-foreground">
              {searching ? "No match" : "Nothing here"}
            </p>
          ) : null}
          {pinned.length > 0 ? (
            <>
              <p className="m-0 mt-1 flex h-7 items-center px-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Pinned
              </p>
              {pinned.map(row)}
            </>
          ) : null}
          {sections.map(({ group, rows, open }) =>
            searching && rows.length === 0 ? null : (
              <div key={group.id}>
                <GroupHeader s={s} group={group} rows={rows} open={open} />
                {open ? rows.map(row) : null}
              </div>
            ),
          )}
          {archived.length > 0 ? (
            <div className="mt-1">
              <button
                type="button"
                data-rail-item
                aria-expanded={s.archivedOpen.value}
                className={cn(SECTION_BUTTON, "mx-1.5 w-[calc(100%-0.75rem)]")}
                onClick={() => {
                  s.archivedOpen.value = !s.archivedOpen.value;
                }}
              >
                <Chevron open={s.archivedOpen.value} />
                Archived {archived.length}
              </button>
              {s.archivedOpen.value
                ? archived.map((item) => <ArchivedRow key={item.agent.id} s={s} item={item} />)
                : null}
            </div>
          ) : null}
        </nav>
      </ScrollArea>
      <footer className="flex h-10 shrink-0 items-center gap-0.5 border-t border-sidebar-border px-2">
        <TipButton label="Settings" keys={["⌘", ","]}>
          <DockIcon name="settings" size={16} />
        </TipButton>
        <ToolsMenu side="top" />
        <span className="flex-1" />
        {attention > 0 ? (
          <Tooltip>
            <TooltipTrigger render={<Badge variant="secondary" className="tabular-nums" />}>
              {attention}
            </TooltipTrigger>
            <TooltipContent side="top">Need you</TooltipContent>
          </Tooltip>
        ) : null}
      </footer>
    </div>
  );
}
