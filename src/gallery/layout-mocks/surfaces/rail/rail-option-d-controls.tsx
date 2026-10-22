import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, MoreVerticalIcon } from "@hugeicons/core-free-icons";
import { useSignal } from "@preact/signals";
import { cn } from "cn";
import type { ComponentChildren } from "preact";
import { Button } from "../../../../ui/controls/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../ui/controls/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../../../../ui/controls/dropdown-menu";
import { Input } from "../../../../ui/controls/input";
import { Kbd, KbdGroup } from "../../../../ui/controls/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../ui/controls/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/controls/tooltip";
import { AGENTS, PROJECTS, placeOf } from "../../layout-fixture";
import { DockIcon, type DockIconName } from "../dock/dock-parts";
import { addAgent, addGroup, type RailD } from "./rail-option-d-state";

export const TOOLS: readonly {
  readonly icon: DockIconName;
  readonly label: string;
  readonly keys: readonly string[];
}[] = [
  { icon: "history", label: "Session history", keys: ["⌘", "⇧", "Y"] },
  { icon: "usage", label: "Token usage", keys: ["⌘", "⇧", "U"] },
  { icon: "files", label: "Explorer", keys: ["⌘", "⇧", "B"] },
  { icon: "prompts", label: "Prompts", keys: ["⌘", "⇧", "P"] },
  { icon: "browser", label: "Browser", keys: ["⌘", "⇧", "I"] },
];

export function Chord({ keys }: { readonly keys: readonly string[] }) {
  return (
    <KbdGroup>
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </KbdGroup>
  );
}

/** An icon button whose name (and chord) lives in a tooltip, never a native title. */
export function TipButton({
  label,
  keys,
  side = "top",
  pressed,
  className,
  children,
  onClick,
}: {
  readonly label: string;
  readonly keys?: readonly string[];
  readonly side?: "top" | "right";
  readonly pressed?: boolean;
  readonly className?: string;
  readonly children: ComponentChildren;
  readonly onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            aria-pressed={pressed}
            className={cn(pressed && "bg-muted text-foreground", className)}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>
        {label}
        {keys ? <Chord keys={keys} /> : null}
      </TooltipContent>
    </Tooltip>
  );
}

/** The header "+": agent, worktree, folder, and a user-made group. */
export function CreateMenu({
  s,
  side = "bottom",
}: {
  readonly s: RailD;
  readonly side?: "bottom" | "right";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="New" />}>
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={side === "right" ? "end" : "start"}
        className="min-w-44"
      >
        <DropdownMenuItem onClick={() => addAgent(s, s.items.value[0].agent)}>
          New agent
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            s.worktreeOpen.value = true;
          }}
        >
          New worktree
        </DropdownMenuItem>
        <DropdownMenuItem>Open folder</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => addGroup(s)}>New group</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One button for the five tools; each row keeps its name and chord. */
export function ToolsMenu({ side }: { readonly side: "top" | "right" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Tools" />}>
        <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={side === "right" ? "end" : "start"}
        className="min-w-52"
      >
        {TOOLS.map((tool) => (
          <DropdownMenuItem key={tool.label}>
            <DockIcon name={tool.icon} size={14} />
            {tool.label}
            <DropdownMenuShortcut>{tool.keys.join("")}</DropdownMenuShortcut>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The worktree form: repo, branch, Create. A Dialog stands in for the missing popover control. */
export function WorktreeDialog({ s }: { readonly s: RailD }) {
  const repo = useSignal(PROJECTS[0].id);
  const branch = useSignal("");
  const submit = () => {
    const name = branch.value.trim();
    if (name === "") return;
    const like = AGENTS.find((agent) => placeOf(agent).project.id === repo.value) ?? AGENTS[0];
    addAgent(s, like, name);
    branch.value = "";
    s.worktreeOpen.value = false;
  };
  return (
    <Dialog
      open={s.worktreeOpen.value}
      onOpenChange={(next: boolean) => {
        s.worktreeOpen.value = next;
      }}
    >
      <DialogContent className="sm:max-w-72">
        <DialogHeader>
          <DialogTitle>New worktree</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Select
            value={repo.value}
            onValueChange={(value) => {
              repo.value = value ?? repo.value;
            }}
          >
            <SelectTrigger aria-label="Repository" className="w-full">
              <SelectValue>{PROJECTS.find((item) => item.id === repo.value)?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PROJECTS.filter((item) => item.kind === "repository").map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            autoFocus
            aria-label="Branch"
            placeholder="branch"
            value={branch.value}
            onInput={(event: Event) => {
              branch.value = (event.currentTarget as HTMLInputElement).value;
            }}
          />
          <DialogFooter>
            <Button type="submit" disabled={branch.value.trim() === ""}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
