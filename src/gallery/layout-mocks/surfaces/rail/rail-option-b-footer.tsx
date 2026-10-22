import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon, ToolsIcon } from "@hugeicons/core-free-icons";
import { Button } from "../../../../ui/controls/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../../../../ui/controls/dropdown-menu";
import { AgentStateMark } from "../../agent-parts";
import { DockIcon, type DockIconName } from "../dock/dock-parts";
import { Tip } from "./rail-option-b-parts";

const TOOLS: readonly { icon: DockIconName; label: string; keys: string }[] = [
  { icon: "history", label: "Session history", keys: "⌘⇧Y" },
  { icon: "usage", label: "Token usage", keys: "⌘⇧U" },
  { icon: "files", label: "Explorer", keys: "⌘⇧B" },
  { icon: "prompts", label: "Prompts", keys: "⌘⇧P" },
  { icon: "browser", label: "Browser", keys: "⌘⇧I" },
];

export function RailFooter({ attention }: { readonly attention: number }) {
  return (
    <footer className="flex h-10 shrink-0 items-center gap-1 border-t border-sidebar-border px-2">
      <Tip label="Settings" keys={["⌘", ","]}>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} aria-hidden="true" />
        </Button>
      </Tip>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" aria-label="Tools" />}>
          <HugeiconsIcon icon={ToolsIcon} strokeWidth={2} aria-hidden="true" />
          Tools
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-52">
          {TOOLS.map((tool) => (
            <DropdownMenuItem key={tool.label}>
              <DockIcon name={tool.icon} size={14} />
              {tool.label}
              <DropdownMenuShortcut>{tool.keys}</DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {attention > 0 ? (
        <Tip label={`${attention} need you`}>
          <span
            role="status"
            aria-label={`${attention} need you`}
            className="ml-auto flex items-center gap-1.5 pr-1 text-[11px] text-muted-foreground tabular-nums"
          >
            <AgentStateMark state="needs-you" />
            {attention}
          </span>
        </Tip>
      ) : null}
    </footer>
  );
}
