/**
 * What a row's pin, archive, menu and rename buttons do. Each command is a call to something
 * that already exists: the session marks in `project-rail-state.ts`, the host callbacks the
 * shipped rail's rows and menus receive, and the clipboard the dev-server chip writes to.
 * Nothing here decides how a tab closes or renames (R4); it only calls the callbacks.
 */
import { writeText } from "../../host/shell-host";
import type { RailItem } from "../rail-view-model";
import type { CardActions } from "../worktree-card-menus";
import { archiveItem, togglePin } from "./project-rail-state";

/** The host callbacks `AgentRail` already receives, handed through unchanged. */
export interface RailRowDeps {
  onClosePane(tabIndex: number, paneId: number): void;
  onCloseTab(tabIndex: number): void;
  /** Absent where nothing owns tab names; the row then has no rename. */
  onRenameTab?(tabIndex: number, name: string | null): void;
  /** Absent where nothing opens folders; the menu then has no Open in Finder. */
  readonly cardActions?: CardActions;
}

export interface RowCommands {
  pin(): void;
  archive(): void;
  /** The shipped row's ✕: closes the pane (agent row) or the tab (shell-only row). */
  close(): void;
  /** Tab-level, agent rows only, like the shipped rail. */
  rename?(name: string | null): void;
  copyPath(): void;
  /** Absent for a folder git does not know. */
  copyBranch?(): void;
  openFolder?(): void;
  readonly openFolderLabel: string;
}

function copyText(text: string): void {
  writeText(text).catch((error: unknown) => {
    console.warn("Deck: could not copy to the clipboard", error);
  });
}

export function rowCommands(item: RailItem, deps: RailRowDeps): RowCommands {
  const { entry, checkout } = item;
  const { onRenameTab, cardActions } = deps;
  const onOpenFolder = cardActions?.onOpenFolder;
  return {
    pin: () => togglePin(item.id),
    archive: () => archiveItem(item.id),
    close: () => {
      if (entry.kind === "agent") {
        deps.onClosePane(entry.tabIndex, entry.paneId);
      } else {
        deps.onCloseTab(entry.tabIndex);
      }
    },
    rename:
      entry.kind === "agent" && onRenameTab !== undefined
        ? (name) => onRenameTab(entry.tabIndex, name)
        : undefined,
    copyPath: () => copyText(checkout.path),
    copyBranch: checkout.labelled ? () => copyText(checkout.branch) : undefined,
    openFolder: onOpenFolder === undefined ? undefined : () => onOpenFolder(checkout.path),
    openFolderLabel: cardActions?.filesAppLabel ?? "Finder",
  };
}
