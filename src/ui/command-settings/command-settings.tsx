import { useEffect, useRef } from "preact/hooks";
import { activeKeyIn, isNavigable, type CommandItem } from "../../settings/command-hits";
import type { CommandSources } from "../../settings/command-search";
import { initSettings, settingsLoadState } from "../../settings/settings-store";
import { LoadError } from "../controls/load-error";
import { settingsTarget } from "../settings/settings-focus-store";
import { openHit, openIssue } from "./command-settings-actions";
import { AreaChips, Footer, SearchField } from "./command-settings-frame";
import { handleCommandKey } from "./command-settings-keys";
import {
  AttentionRow,
  EmptyRow,
  Head,
  HitRow,
  rowDomId,
  SectionMount,
} from "./command-settings-rows";
import { commandActiveKey, commandQuery, commandScope } from "./command-settings-state";
import {
  areaLabel,
  commandListItems,
  commandSources,
  hitValueText,
  issueText,
} from "./command-settings-view";

interface CommandSettingsProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/** What Enter does on the highlighted row, for the footer hint. */
function enterLabel(item: CommandItem | undefined): string | null {
  if (item === undefined) {
    return null;
  }
  return item.type === "hit" && item.hit.kind === "area" ? "Open" : "Go to";
}

interface ListProps {
  readonly items: readonly CommandItem[];
  readonly active: string | null;
  readonly sources: CommandSources;
  /** The home list has no area headings, so a row names its own area. */
  readonly crumbs: boolean;
}

function List({ items, active, sources, crumbs }: ListProps) {
  return (
    <ul className="m-0 list-none">
      {items.map((item) => {
        switch (item.type) {
          case "head":
            return <Head key={item.key} title={item.title} />;
          case "hit":
            return (
              <HitRow
                key={item.key}
                itemKey={item.key}
                hit={item.hit}
                value={hitValueText(item.hit, sources)}
                crumb={crumbs ? areaLabel(item.hit.area, sources) : null}
                active={item.key === active}
                onOpen={() => openHit(item.hit)}
              />
            );
          case "attention":
            return (
              <AttentionRow
                key={item.key}
                itemKey={item.key}
                issue={item.issue}
                text={issueText(item.issue, sources)}
                crumb={areaLabel(item.issue.area, sources)}
                active={item.key === active}
                onOpen={() => openIssue(item.issue)}
              />
            );
          case "section":
            return <SectionMount key={item.key} area={item.area} />;
          case "empty":
            return (
              <EmptyRow
                key={item.key}
                query={item.query}
                onClear={() => {
                  commandQuery.value = "";
                }}
              />
            );
        }
      })}
    </ul>
  );
}

/**
 * The surface itself. It exists only while Settings is open, so its listener,
 * its focus and its leftover deep-link target all end with it.
 *
 * Three keyboard contracts carry over from the screen it replaces:
 *
 * - **Escape belongs to the innermost owner** (`command-settings-keys.ts`).
 * - **Focus cannot leave the surface.** The layer covers the window but the app
 *   behind it stays in the document, so Tab is wrapped inside it.
 * - **A loading snapshot cannot overwrite an edit.** `initSettings` assigns the
 *   disk snapshot over `settings.value` when it resolves, so the list is inert
 *   (a disabled fieldset) until it has landed. The field and the chips stay live:
 *   they edit nothing.
 */
function CommandSurface({ onClose }: { readonly onClose: () => void }) {
  const rootRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<readonly CommandItem[]>([]);

  const query = commandQuery.value;
  const scope = commandScope.value;
  const sources = commandSources();
  const items = commandListItems(query, scope, sources);
  itemsRef.current = items;
  const activeKey = activeKeyIn(items, commandActiveKey.value);
  const current = items.find((item) => item.key === activeKey);
  const load = settingsLoadState.value;
  const loading = load.status === "loading";

  // Focus moves in on open so Escape reaches the listener below instead of the terminal that
  // had it, and goes back to where it was when nothing (the app's own close path) put it elsewhere.
  useEffect(() => {
    const previous = document.activeElement;
    const root = rootRef.current;
    searchRef.current?.focus({ preventScroll: true });
    return () => {
      settingsTarget.value = null;
      commandQuery.value = "";
      const focused = document.activeElement;
      const stranded = focused === null || focused === document.body || root?.contains(focused);
      if (stranded && previous instanceof HTMLElement && previous.isConnected) {
        previous.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      handleCommandKey(event, {
        root: rootRef.current,
        search: searchRef.current,
        items: itemsRef.current,
        onClose,
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (activeKey !== null) {
      document.getElementById(rowDomId(activeKey))?.scrollIntoView?.({ block: "nearest" });
    }
  }, [activeKey]);

  const esc = query !== "" ? "Clear" : scope !== null ? "Back" : "Close";
  return (
    <section
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      className="ui-preset fixed inset-0 z-35 flex flex-col"
    >
      {/* The layer covers the window's own frame row, so this strip is the only draggable
          one while Settings is open (`11-settings-screen.css`, "Window dragging"). Nothing
          sits in it, which also keeps clear of the traffic lights and the caption buttons. */}
      <div aria-hidden="true" data-tauri-drag-region className="h-(--frame-h) shrink-0" />
      <div className="mx-auto flex min-h-0 w-full max-w-190 flex-1 flex-col">
        <header className="flex shrink-0 flex-col gap-2 p-3">
          <SearchField
            inputRef={searchRef}
            scope={scope}
            scopeLabel={scope === null ? null : areaLabel(scope, sources)}
          />
          <AreaChips
            scope={scope}
            onChoose={() => searchRef.current?.focus({ preventScroll: true })}
          />
        </header>
        {load.status === "error" ? (
          <LoadError message={load.message} onRetry={() => void initSettings()} />
        ) : null}
        <div
          role="region"
          aria-label="Results"
          aria-busy={loading}
          className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5"
        >
          <fieldset disabled={loading} className="min-w-0">
            <List
              items={items}
              active={activeKey}
              sources={sources}
              crumbs={scope === null && query.trim() === ""}
            />
          </fieldset>
        </div>
        <Footer move={items.some(isNavigable)} enter={enterLabel(current)} esc={esc} />
      </div>
    </section>
  );
}

export function CommandSettings({ open, onClose }: CommandSettingsProps) {
  return open ? <CommandSurface onClose={onClose} /> : null;
}
