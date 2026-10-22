import { useSignal } from "@preact/signals";
import { ToggleGroup, ToggleGroupItem } from "../../../../ui/controls/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../ui/controls/select";
import type { MockAgent, MockFileChange } from "../../layout-fixture";
import { Counts, EmptyChanges, RefreshButton, changesOf, totalsOf } from "./changes-parts";
import { FileRow, flipped } from "./changes-row";

type Filter = "all" | MockFileChange["status"];
type Sort = "path" | "size" | "status";
const SORTS: Readonly<Record<Sort, string>> = { path: "Path", size: "Size", status: "Status" };
const sorters: Readonly<Record<Sort, (a: MockFileChange, b: MockFileChange) => number>> = {
  path: (a, b) => a.path.localeCompare(b.path),
  size: (a, b) => b.added + b.removed - (a.added + a.removed),
  status: (a, b) => a.status.localeCompare(b.status) || a.path.localeCompare(b.path),
};

/** Flat list with stock sort and status filter; preview expands per file. */
export function FlatChanges({ agent }: { agent: MockAgent }) {
  const all = changesOf(agent);
  const filter = useSignal<Filter>("all");
  const sort = useSignal<Sort>("path");
  const selected = useSignal<string | null>(null);
  const open = useSignal<ReadonlySet<string>>(new Set());
  const rows = all
    .filter((item) => filter.value === "all" || item.status === filter.value)
    .sort(sorters[sort.value]);
  const total = totalsOf(rows);
  const count = (status: Filter) =>
    (status === "all" ? all : all.filter((i) => i.status === status)).length;
  if (all.length === 0) return <EmptyChanges />;
  return (
    <div className="flex min-h-0 flex-col text-xs">
      <div className="flex h-9 items-center gap-1.5 px-2">
        <ToggleGroup
          size="sm"
          variant="outline"
          spacing={0}
          aria-label="Filter by status"
          value={[filter.value]}
          onValueChange={(next: string[]) => {
            if (next.length) filter.value = next[next.length - 1] as Filter;
          }}
        >
          {(["all", "M", "A", "D"] as const).map((key) => (
            <ToggleGroupItem
              key={key}
              value={key}
              aria-label={key === "all" ? "All files" : `Status ${key}`}
              className="font-mono"
            >
              {key === "all" ? "All" : key} {count(key)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Select value={sort.value} onValueChange={(next) => (sort.value = next as Sort)}>
          <SelectTrigger size="sm" aria-label="Sort by" className="ml-auto w-20">
            <SelectValue>{SORTS[sort.value]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORTS) as Sort[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORTS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RefreshButton />
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((change) => (
          <FileRow
            key={change.path}
            change={change}
            agent={agent}
            fullPath
            selected={selected.value === change.path}
            onSelect={() => (selected.value = change.path)}
            expanded={open.value.has(change.path)}
            onToggle={() => (open.value = flipped(open.value, change.path))}
          />
        ))}
      </ul>
      {rows.length === 0 ? (
        <p className="m-0 px-3 py-4 text-muted-foreground">No {filter.value} files.</p>
      ) : (
        <div className="mt-1 flex h-8 items-center justify-between border-t px-3 text-foreground">
          <span className="tabular-nums">
            {rows.length} {rows.length === 1 ? "file" : "files"}
          </span>
          <Counts added={total.added} removed={total.removed} />
        </div>
      )}
    </div>
  );
}
