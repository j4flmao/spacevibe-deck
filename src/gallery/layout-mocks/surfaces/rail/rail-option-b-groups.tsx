import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowDown01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "../../../../ui/controls/button";
import type { Group } from "./rail-option-b-model";
import { Tip } from "./rail-option-b-parts";

/** A foldable group header with its count and, when asked, a hover "+" for the group's project. */
export function GroupHeader({
  group,
  open,
  onToggle,
  onAdd,
}: {
  readonly group: Pick<Group, "label"> & { readonly count: number };
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly onAdd?: () => void;
}) {
  return (
    <div className="group/head relative mx-1.5 flex h-6 items-center rounded-md">
      <button
        type="button"
        data-nav=""
        aria-expanded={open}
        onClick={onToggle}
        className="flex h-6 min-w-0 flex-1 cursor-default items-center gap-1.5 rounded-md px-2.5 text-left text-[11px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <HugeiconsIcon
          icon={open ? ArrowDown01Icon : ArrowRight01Icon}
          size={12}
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="truncate">{group.label}</span>
        <span className="tabular-nums">{group.count}</span>
      </button>
      {onAdd ? (
        <Tip label={`New agent in ${group.label}`}>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`New agent in ${group.label}`}
            className="mr-1 size-5 text-muted-foreground opacity-0 group-focus-within/head:opacity-100 group-hover/head:opacity-100"
            onClick={onAdd}
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} aria-hidden="true" />
          </Button>
        </Tip>
      ) : null}
    </div>
  );
}

export function EmptyState({
  searching,
  onClear,
  onNew,
}: {
  readonly searching: boolean;
  readonly onClear: () => void;
  readonly onNew: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <p className="m-0 text-xs text-muted-foreground">{searching ? "No match" : "No agents"}</p>
      <Button variant="outline" size="sm" onClick={searching ? onClear : onNew}>
        {searching ? "Clear search" : "New agent"}
      </Button>
    </div>
  );
}
