import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  FilterHorizontalIcon,
  FolderOpenIcon,
  GitBranchIcon,
  Search01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { Button } from "../../../../ui/controls/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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
import { PROJECTS } from "../../layout-fixture";
import { GROUPING_LABEL, SORTING_LABEL, type Grouping, type Sorting } from "./rail-option-b-model";
import { Tip } from "./rail-option-b-parts";
import type { RailState } from "./rail-option-b-state";

const REPOSITORIES = PROJECTS.filter((item) => item.kind === "repository");
const REPO_ITEMS = REPOSITORIES.map((item) => ({ value: item.id, label: item.name }));
const FOLDER = PROJECTS.find((item) => item.kind === "folder") ?? PROJECTS[0];

function WorktreeForm({
  s,
  anchor,
  onClose,
}: {
  readonly s: RailState;
  readonly anchor: HTMLElement | null;
  readonly onClose: () => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const repo = useSignal(REPOSITORIES[0]?.id ?? "");
  useEffect(() => {
    ref.current?.querySelector<HTMLInputElement>("input[name=branch]")?.focus();
    const onPress = (event: PointerEvent) => {
      const target = event.target as Element;
      if (ref.current?.contains(target) || anchor?.contains(target)) return;
      if (target.closest("[data-slot^='select']")) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPress);
    return () => document.removeEventListener("pointerdown", onPress);
  }, [anchor, onClose]);
  return (
    <form
      ref={ref}
      aria-label="New worktree"
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
      }}
      onSubmit={(event: Event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget as HTMLFormElement);
        const branch = String(data.get("branch") ?? "").trim();
        if (branch === "") return;
        const name = REPOSITORIES.find((item) => item.id === repo.value)?.name ?? repo.value;
        s.add(repo.value, branch, `~/dev/${name}/.worktrees/${branch.replaceAll("/", "-")}`);
        onClose();
      }}
      className="absolute inset-x-2 top-full z-30 mt-1 flex flex-col gap-2 rounded-lg bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      <Select
        value={repo.value}
        items={REPO_ITEMS}
        onValueChange={(value: string | null) => {
          if (value) repo.value = value;
        }}
      >
        <SelectTrigger aria-label="Repository" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {REPO_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input name="branch" aria-label="Branch" placeholder="feat/branch-name" autoComplete="off" />
      <Button type="submit" size="sm" className="self-end">
        Create
      </Button>
    </form>
  );
}

function OrganizeMenu({ s }: { readonly s: RailState }) {
  return (
    <DropdownMenu>
      <Tip label="Organize">
        <span className="inline-flex">
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Organize" className="shrink-0" />
            }
          >
            <HugeiconsIcon icon={FilterHorizontalIcon} strokeWidth={2} aria-hidden="true" />
          </DropdownMenuTrigger>
        </span>
      </Tip>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Group</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={s.grouping.value}
            onValueChange={(value: string) => {
              s.grouping.value = value as Grouping;
            }}
          >
            {(Object.keys(GROUPING_LABEL) as Grouping[]).map((key) => (
              <DropdownMenuRadioItem key={key} value={key}>
                {GROUPING_LABEL[key]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={s.sorting.value}
            onValueChange={(value: string) => {
              s.sorting.value = value as Sorting;
            }}
          >
            {(Object.keys(SORTING_LABEL) as Sorting[]).map((key) => (
              <DropdownMenuRadioItem key={key} value={key}>
                {SORTING_LABEL[key]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={s.archivedOpen.value}
          onCheckedChange={(checked: boolean) => {
            s.archivedOpen.value = checked;
          }}
        >
          Show archived
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RailHeader({
  s,
  searchRef,
}: {
  readonly s: RailState;
  readonly searchRef: preact.RefObject<HTMLDivElement>;
}) {
  const formOpen = useSignal(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const query = s.query.value;
  return (
    <div className="relative flex shrink-0 items-center gap-1 px-2 pt-3 pb-2">
      <div ref={searchRef} className="relative min-w-0 flex-1">
        <HugeiconsIcon
          icon={Search01Icon}
          size={13}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Search agents"
          placeholder="Search"
          autoComplete="off"
          value={query}
          className="pr-7 pl-7"
          onInput={(event: Event) => {
            s.query.value = (event.currentTarget as HTMLInputElement).value;
          }}
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              document.querySelector<HTMLElement>("[data-nav]")?.focus();
            }
            if (event.key !== "Escape") return;
            event.stopPropagation();
            s.query.value = "";
            document.querySelector<HTMLElement>(`[data-row="${s.stop.value}"]`)?.focus();
          }}
        />
        {query === "" ? null : (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Clear search"
            className="absolute top-1 right-1 size-5 text-muted-foreground"
            onClick={() => {
              s.query.value = "";
              searchRef.current?.querySelector("input")?.focus();
            }}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
          </Button>
        )}
      </div>
      <OrganizeMenu s={s} />
      <DropdownMenu>
        <Tip label="New" keys={["⌘", "T"]}>
          <span className="inline-flex">
            <DropdownMenuTrigger
              render={
                <Button
                  ref={anchor}
                  variant="ghost"
                  size="icon"
                  aria-label="New"
                  className="shrink-0"
                />
              }
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} aria-hidden="true" />
            </DropdownMenuTrigger>
          </span>
        </Tip>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onClick={() => s.add(PROJECTS[0].id, "main")}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} aria-hidden="true" />
            New agent
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              formOpen.value = true;
            }}
          >
            <HugeiconsIcon icon={GitBranchIcon} strokeWidth={2} aria-hidden="true" />
            New worktree
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => s.add(FOLDER.id, null, "~/dev/tiny-cli")}>
            <HugeiconsIcon icon={FolderOpenIcon} strokeWidth={2} aria-hidden="true" />
            Open folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {formOpen.value ? (
        <WorktreeForm
          s={s}
          anchor={anchor.current}
          onClose={() => {
            formOpen.value = false;
          }}
        />
      ) : null}
    </div>
  );
}
