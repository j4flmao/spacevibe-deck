import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  BrowserIcon,
  ChartHistogramIcon,
  Clock01Icon,
  Folder01Icon,
  Message01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "../../../../ui/controls/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../../../../ui/controls/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/controls/tooltip";
import type { Notice } from "./rail-option-a-parts";

function Tip({ label, children }: { readonly label: string; readonly children: preact.VNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function EmptyState({
  filtered,
  onClear,
}: {
  readonly filtered: boolean;
  readonly onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span className="text-[13px] text-muted-foreground">
        {filtered ? "No match" : "Nothing here"}
      </span>
      {filtered ? (
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}

export function UndoNotice({
  notice,
  onDismiss,
}: {
  readonly notice: Notice | null;
  readonly onDismiss: () => void;
}) {
  return (
    <div role="status" className="shrink-0 empty:hidden">
      {notice ? (
        <div className="mx-2 mb-1.5 flex h-8 items-center justify-between gap-2 rounded-md bg-muted px-2.5 text-[11px] text-foreground">
          <span className="truncate">{notice.text}</span>
          {notice.undo ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                notice.undo?.();
                onDismiss();
              }}
            >
              Undo
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const TOOLS = [
  { label: "Session history", keys: "⌘⇧Y", icon: Clock01Icon },
  { label: "Token usage", keys: "⌘⇧U", icon: ChartHistogramIcon },
  { label: "Explorer", keys: "⌘⇧B", icon: Folder01Icon },
  { label: "Prompts", keys: "⌘⇧P", icon: Message01Icon },
  { label: "Browser", keys: "⌘⇧I", icon: BrowserIcon },
] as const;

export function RailFooter({
  attention,
  onTool,
}: {
  readonly attention: number;
  readonly onTool: (label: string) => void;
}) {
  return (
    <footer className="flex shrink-0 items-center gap-1 border-t border-sidebar-border px-2 py-1.5">
      <Tip label="Settings">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          onClick={() => onTool("Settings")}
        >
          <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} aria-hidden="true" />
        </Button>
      </Tip>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" aria-label="Tools" />}>
          Tools
          <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-52">
          {TOOLS.map((tool) => (
            <DropdownMenuItem key={tool.label} onClick={() => onTool(tool.label)}>
              <HugeiconsIcon icon={tool.icon} strokeWidth={2} aria-hidden="true" />
              {tool.label}
              <DropdownMenuShortcut>{tool.keys}</DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {attention > 0 ? (
        <Tip label="Need you or unread">
          <span className="ml-auto rounded-full bg-muted px-2 text-[11px] leading-5 text-foreground tabular-nums">
            {attention}
          </span>
        </Tip>
      ) : null}
    </footer>
  );
}
