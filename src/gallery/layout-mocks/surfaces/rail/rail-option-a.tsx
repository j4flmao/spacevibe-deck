import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { AGENTS } from "../../layout-fixture";
import type { PanelOption } from "../surface-types";
import {
  SECTION_ORDER,
  SECTION_TITLE,
  attentionCount,
  matches,
  newRow,
  seedRows,
  sectionOf,
  worktreePath,
  type FlatRow,
} from "./rail-option-a-model";
import {
  ArchivedToggle,
  RailHeader,
  SearchBar,
  SectionTitle,
  type Notice,
} from "./rail-option-a-parts";
import { EmptyState, RailFooter, UndoNotice } from "./rail-option-a-footer";
import { FlatRowItem, rowTitle, type RowAction } from "./rail-option-a-row";

const UNDO_MS = 5000;
const NOTICE_MS = 2500;

function RailA({
  initialId,
  focus,
}: {
  readonly initialId: string;
  readonly focus: (id: string) => void;
}) {
  const rows = useSignal<readonly FlatRow[]>(seedRows());
  const query = useSignal("");
  const scope = useSignal<string | null>(null);
  const selected = useSignal(initialId);
  const roving = useSignal(initialId);
  const archivedOpen = useSignal(false);
  const menuRow = useSignal<string | null>(null);
  const renameId = useSignal<string | null>(null);
  const notice = useSignal<Notice | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (notice.value === null) return;
    const timer = window.setTimeout(
      () => {
        notice.value = null;
      },
      notice.value.undo ? UNDO_MS : NOTICE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [notice.value]);

  const patch = (id: string, change: Partial<FlatRow>) => {
    rows.value = rows.value.map((row) => (row.id === id ? { ...row, ...change } : row));
  };
  const say = (text: string) => {
    notice.value = { text };
  };
  const copy = (text: string, what: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    say(`${what} copied`);
  };
  const select = (row: FlatRow) => {
    selected.value = row.id;
    roving.value = row.id;
    if (!row.local && AGENTS.some((item) => item.id === row.id)) focus(row.id);
  };
  const add = (row: FlatRow) => {
    rows.value = [...rows.value, row];
    select(row);
  };
  const base = (): FlatRow => rows.value.find((row) => row.id === selected.value) ?? rows.value[0];

  const act = (row: FlatRow, action: RowAction) => {
    menuRow.value = null;
    switch (action) {
      case "rename":
        renameId.value = row.id;
        break;
      case "pin":
        patch(row.id, { pinned: !row.pinned });
        break;
      case "toggle-read":
        patch(row.id, {
          agent: {
            ...row.agent,
            state: row.agent.state === "unchecked" ? "done" : "unchecked",
          },
        });
        break;
      case "copy-path":
        copy(row.path, "Path");
        break;
      case "copy-branch":
        if (row.branch !== null) copy(row.branch, "Branch");
        break;
      case "finder":
        say(`Revealed ${row.project.name}`);
        break;
      case "archive":
        patch(row.id, { archived: true });
        notice.value = {
          text: `Archived ${rowTitle(row).slice(0, 28)}`,
          undo: () => patch(row.id, { archived: false }),
        };
        break;
      case "unarchive":
        patch(row.id, { archived: false });
        break;
    }
  };

  const filtered = query.value.trim() !== "" || scope.value !== null;
  const visible = rows.value.filter(
    (row) => (scope.value === null || row.project.id === scope.value) && matches(row, query.value),
  );
  const archived = visible.filter((row) => row.archived);
  const live = visible.filter((row) => !row.archived);
  const order = [
    ...SECTION_ORDER.flatMap((section) => live.filter((row) => sectionOf(row) === section)),
    ...(archivedOpen.value ? archived : []),
  ];
  const tabStopId = order.some((row) => row.id === roving.value) ? roving.value : order[0]?.id;

  const focusRow = (id: string | undefined) => {
    const target = id
      ? listRef.current?.querySelector<HTMLElement>(`[data-row-id="${id}"] [data-rail-row]`)
      : null;
    target?.focus();
  };

  const onNavKey = (event: KeyboardEvent) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("[data-rail-row]") ?? [],
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    if (event.key === "ArrowUp" && index === 0) {
      searchRef.current?.querySelector("input")?.focus();
      return;
    }
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : Math.min(buttons.length - 1, index + (event.key === "ArrowDown" ? 1 : -1));
    buttons[next].focus();
    roving.value = buttons[next].closest<HTMLElement>("[data-row-id]")?.dataset.rowId ?? "";
  };

  return (
    <div
      className="flex h-full flex-col bg-sidebar text-sidebar-foreground"
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (event.key === "/" && !target.closest("input,textarea")) {
          event.preventDefault();
          searchRef.current?.querySelector("input")?.focus();
        }
      }}
    >
      <RailHeader
        onAgent={() => add(newRow(base().agent, base()))}
        onWorktree={(repo, branch) => {
          add(
            newRow(base().agent, {
              project: repo,
              branch,
              path: worktreePath(repo, branch),
            }),
          );
          say(`Worktree ${branch} created`);
        }}
        onFolder={() => say("Folder picker opens here")}
      />
      <SearchBar
        inputRef={searchRef}
        query={query.value}
        scope={scope.value}
        onQuery={(value) => {
          query.value = value;
        }}
        onScope={(value) => {
          scope.value = value;
        }}
        onLeave={() => focusRow(tabStopId)}
      />
      <nav
        ref={listRef}
        aria-label="Agents"
        className="min-h-0 flex-1 overflow-y-auto pb-2"
        onKeyDown={onNavKey}
      >
        {live.length === 0 && archived.length === 0 ? (
          <EmptyState
            filtered={filtered}
            onClear={() => {
              query.value = "";
              scope.value = null;
            }}
          />
        ) : null}
        {SECTION_ORDER.map((section) => {
          const items = live.filter((row) => sectionOf(row) === section);
          if (items.length === 0) return null;
          return (
            <section key={section} className="pt-2">
              <SectionTitle label={SECTION_TITLE[section]} count={items.length} />
              {items.map((row) => renderRow(row))}
            </section>
          );
        })}
        {archived.length > 0 ? (
          <section className="pt-2">
            <ArchivedToggle
              count={archived.length}
              open={archivedOpen.value}
              onToggle={() => {
                archivedOpen.value = !archivedOpen.value;
              }}
            />
            {archivedOpen.value ? archived.map((row) => renderRow(row)) : null}
          </section>
        ) : null}
      </nav>
      <UndoNotice
        notice={notice.value}
        onDismiss={() => {
          notice.value = null;
        }}
      />
      <RailFooter
        attention={attentionCount(rows.value)}
        onTool={(label) => say(`${label} opens here`)}
      />
    </div>
  );

  function renderRow(row: FlatRow) {
    return (
      <FlatRowItem
        key={row.id}
        row={row}
        selected={row.id === selected.value}
        tabStop={row.id === tabStopId}
        renaming={renameId.value === row.id}
        menuOpen={menuRow.value === row.id}
        onSelect={() => select(row)}
        onRenameEnd={(value) => {
          if (renameId.value !== row.id) return;
          renameId.value = null;
          if (value !== null) patch(row.id, { label: value === "" ? null : value });
        }}
        onMenuOpenChange={(open) => {
          menuRow.value = open ? row.id : null;
        }}
        onAction={(action) => act(row, action)}
      />
    );
  }
}

export const RAIL_A: PanelOption = {
  id: "a",
  label: "Flat inbox",
  concept:
    "One flat list across every project, grouped by lifecycle instead of by project, where archiving is the cheap way to settle work and a five-second undo makes it safe.",
  area: ["chrome-only"],
  frame: "panel",
  width: 300,
  render: (agent, focus) => <RailA initialId={agent.id} focus={focus} />,
};
