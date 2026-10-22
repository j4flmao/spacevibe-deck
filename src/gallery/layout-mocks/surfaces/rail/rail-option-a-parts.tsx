import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowDown01Icon,
  FilterHorizontalIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { useSignal } from "@preact/signals";
import { cn } from "cn";
import type { Ref } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { Button } from "../../../../ui/controls/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../../../ui/controls/dropdown-menu";
import { Input } from "../../../../ui/controls/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../ui/controls/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/controls/tooltip";
import { PROJECTS, type MockProject } from "../../layout-fixture";
import { REPOSITORIES } from "./rail-option-a-model";

export interface Notice {
  readonly text: string;
  readonly undo?: () => void;
}

function Tip({ label, children }: { readonly label: string; readonly children: preact.VNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function WorktreeForm({
  onCreate,
  onClose,
}: {
  readonly onCreate: (repo: MockProject, branch: string) => void;
  readonly onClose: () => void;
}) {
  const repo = useSignal(REPOSITORIES[0].id);
  const branch = useSignal("");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    // The menu hands focus back to its trigger as it closes; take it after that.
    const timer = window.setTimeout(
      () => formRef.current?.querySelector<HTMLInputElement>("input[aria-label=Branch]")?.focus(),
      80,
    );
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const away = (event: PointerEvent) => {
      if (!formRef.current?.contains(event.target as Node)) onClose();
    };
    const esc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  return (
    <form
      ref={formRef}
      aria-label="New worktree"
      className="absolute inset-x-2 top-full z-30 flex flex-col gap-1.5 rounded-lg bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10"
      onSubmit={(event) => {
        event.preventDefault();
        const name = branch.value.trim();
        if (name === "") return;
        onCreate(REPOSITORIES.find((item) => item.id === repo.value) ?? REPOSITORIES[0], name);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <Select
        value={repo.value}
        onValueChange={(value: string | null) => {
          if (value) repo.value = value;
        }}
      >
        <SelectTrigger aria-label="Repository" className="w-full">
          <SelectValue>{REPOSITORIES.find((item) => item.id === repo.value)?.name}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {REPOSITORIES.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-1.5">
        <Input
          aria-label="Branch"
          placeholder="branch"
          value={branch.value}
          onInput={(event) => {
            branch.value = event.currentTarget.value;
          }}
        />
        <Button type="submit" disabled={branch.value.trim() === ""}>
          Create
        </Button>
      </div>
    </form>
  );
}

export function RailHeader({
  onAgent,
  onWorktree,
  onFolder,
}: {
  readonly onAgent: () => void;
  readonly onWorktree: (repo: MockProject, branch: string) => void;
  readonly onFolder: () => void;
}) {
  const form = useSignal(false);
  return (
    <header className="relative flex h-10 shrink-0 items-center justify-between px-3">
      <span className="text-[13px] font-medium">Agents</span>
      <DropdownMenu>
        <Tip label="New">
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="New" />}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} aria-hidden="true" />
          </DropdownMenuTrigger>
        </Tip>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onClick={onAgent}>New agent</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              form.value = true;
            }}
          >
            New worktree
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onFolder}>Open folder</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {form.value ? (
        <WorktreeForm
          onClose={() => {
            form.value = false;
          }}
          onCreate={(repo, branch) => {
            form.value = false;
            onWorktree(repo, branch);
          }}
        />
      ) : null}
    </header>
  );
}

export function SearchBar({
  inputRef,
  query,
  scope,
  onQuery,
  onScope,
  onLeave,
}: {
  readonly inputRef: Ref<HTMLDivElement>;
  readonly query: string;
  readonly scope: string | null;
  readonly onQuery: (value: string) => void;
  readonly onScope: (value: string | null) => void;
  /** Esc with nothing to clear, or ArrowDown: hand focus to the list. */
  readonly onLeave: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 px-2 pb-1.5">
      <div ref={inputRef} className="relative min-w-0 flex-1">
        <HugeiconsIcon
          icon={Search01Icon}
          size={13}
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Search agents"
          placeholder="Search"
          value={query}
          className="pl-7"
          onInput={(event) => onQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              if (query !== "") onQuery("");
              else onLeave();
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              onLeave();
            }
          }}
        />
      </div>
      <DropdownMenu>
        <Tip
          label={scope === null ? "Project" : (PROJECTS.find((p) => p.id === scope)?.name ?? "")}
        >
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Project scope"
                className={cn(scope !== null && "bg-muted text-foreground")}
              />
            }
          >
            <HugeiconsIcon icon={FilterHorizontalIcon} strokeWidth={2} aria-hidden="true" />
          </DropdownMenuTrigger>
        </Tip>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuRadioGroup
            value={scope ?? "all"}
            onValueChange={(next: string) => onScope(next === "all" ? null : next)}
          >
            <DropdownMenuRadioItem value="all">All projects</DropdownMenuRadioItem>
            {PROJECTS.map((item) => (
              <DropdownMenuRadioItem key={item.id} value={item.id}>
                {item.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SectionTitle({ label, count }: { readonly label: string; readonly count: number }) {
  return (
    <div className="flex h-6 items-center gap-1.5 px-4 text-[11px] font-medium text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums">{count}</span>
    </div>
  );
}

export function ArchivedToggle({
  count,
  open,
  onToggle,
}: {
  readonly count: number;
  readonly open: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className="mx-1.5 flex h-6 w-[calc(100%-0.75rem)] cursor-default items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        size={12}
        strokeWidth={2}
        className={cn(!open && "-rotate-90")}
        aria-hidden="true"
      />
      <span>Archived</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
