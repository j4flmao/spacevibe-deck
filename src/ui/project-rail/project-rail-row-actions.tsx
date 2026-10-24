import {
  Archive,
  Copy,
  DotsThree,
  FolderOpen,
  GitBranch,
  PencilSimple,
  PushPin,
  PushPinSlash,
  X,
} from "@phosphor-icons/react";
import { useRef } from "preact/hooks";
import { cn } from "@/lib/cn";
import { Button } from "../controls/button";
import { DeckIcon, ROW_ICON } from "../controls/deck-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../controls/dropdown-menu";
import type { RowCommands } from "./project-rail-commands";
import { MenuEntry, Tip } from "./project-rail-menu-parts";

/** Hover actions show on hover, keyboard focus or while their menu is open; they never take room. */
const REVEAL =
  "pointer-events-none opacity-0 group-hover/item:pointer-events-auto group-hover/item:opacity-100 group-focus-within/item:pointer-events-auto group-focus-within/item:opacity-100 has-[[data-popup-open]]:pointer-events-auto has-[[data-popup-open]]:opacity-100";

export interface ProjectRailRowActionsProps {
  /** The row's title, so every button names the row it acts on. */
  readonly title: string;
  readonly pinned: boolean;
  /** The row Tab reaches; the other rows' buttons wait behind the arrow keys and the menu. */
  readonly tabStop: boolean;
  readonly commands: RowCommands;
  /** Controlled, so the right-click opens the same menu as the more button. */
  readonly menuOpen: boolean;
  readonly onMenuOpenChange: (open: boolean) => void;
  /** Start renaming; called once the menu has finished closing and returned focus. */
  readonly onRename: () => void;
}

/** Pin, archive and the more menu, laid over the row's trailing edge (LAY-2). */
export function ProjectRailRowActions({
  title,
  pinned,
  tabStop,
  commands,
  menuOpen,
  onMenuOpenChange,
  onRename,
}: ProjectRailRowActionsProps) {
  const tabIndex = tabStop ? 0 : -1;
  const pinLabel = pinned ? "Unpin" : "Pin";
  // The menu hands focus back to its trigger as it closes, and the field would lose it to that.
  const renameWhenClosed = useRef(false);
  return (
    <div
      className={cn(
        "absolute top-1 right-1.5 flex items-center gap-0.5 rounded-md bg-accent p-0.5",
        REVEAL,
      )}
    >
      <Tip
        label={pinLabel}
        button={
          <Button
            variant="ghost"
            size="icon-xs"
            tabIndex={tabIndex}
            aria-label={`${pinLabel} ${title}`}
            onClick={commands.pin}
          />
        }
      >
        <DeckIcon icon={pinned ? PushPinSlash : PushPin} size={ROW_ICON} />
      </Tip>
      <Tip
        label="Archive"
        button={
          <Button
            variant="ghost"
            size="icon-xs"
            tabIndex={tabIndex}
            aria-label={`Archive ${title}`}
            onClick={commands.archive}
          />
        }
      >
        <DeckIcon icon={Archive} size={ROW_ICON} />
      </Tip>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onOpenChangeComplete={(open: boolean) => {
          if (!open && renameWhenClosed.current) {
            renameWhenClosed.current = false;
            onRename();
          }
        }}
      >
        <Tip
          label="More"
          button={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  tabIndex={tabIndex}
                  aria-label={`More actions for ${title}`}
                />
              }
            />
          }
        >
          <DeckIcon icon={DotsThree} size={ROW_ICON} />
        </Tip>
        <DropdownMenuContent align="end" className="min-w-44">
          {commands.rename === undefined ? null : (
            <MenuEntry
              icon={PencilSimple}
              onClick={() => {
                renameWhenClosed.current = true;
              }}
            >
              Rename
            </MenuEntry>
          )}
          <MenuEntry icon={pinned ? PushPinSlash : PushPin} onClick={commands.pin}>
            {pinLabel}
          </MenuEntry>
          <DropdownMenuSeparator />
          <MenuEntry icon={Copy} onClick={commands.copyPath}>
            Copy path
          </MenuEntry>
          <MenuEntry
            icon={GitBranch}
            disabled={commands.copyBranch === undefined}
            onClick={() => commands.copyBranch?.()}
          >
            Copy branch
          </MenuEntry>
          {commands.openFolder === undefined ? null : (
            <MenuEntry icon={FolderOpen} onClick={commands.openFolder}>
              Open in {commands.openFolderLabel}
            </MenuEntry>
          )}
          <DropdownMenuSeparator />
          <MenuEntry icon={Archive} onClick={commands.archive}>
            Archive
          </MenuEntry>
          <MenuEntry icon={X} variant="destructive" onClick={commands.close}>
            Close
          </MenuEntry>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
