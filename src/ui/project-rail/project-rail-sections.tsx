import type { RailGroup, RailItem } from "../rail-view-model";
import { rowCommands, type RailRowDeps } from "./project-rail-commands";
import { ProjectRailHeader } from "./project-rail-header";
import { selectRailItem, type RailSelection } from "./project-rail-model";
import { ProjectRailRow } from "./project-rail-row";
import { toggleProjectFolded } from "./project-rail-state";

/** What every row of the list needs besides its own item. */
export interface RailRowEnv {
  /** The one row Tab reaches. */
  readonly tabStopId: string | undefined;
  readonly pinned: ReadonlySet<string>;
  readonly selection: RailSelection;
  readonly deps: RailRowDeps;
}

function RailRows({
  items,
  env,
  named,
}: {
  readonly items: readonly RailItem[];
  readonly env: RailRowEnv;
  /** Outside By project a row names its own project (LAY-3). */
  readonly named: boolean;
}) {
  return (
    <>
      {items.map((item) => (
        <ProjectRailRow
          key={item.id}
          item={item}
          tabStop={item.id === env.tabStopId}
          pinned={env.pinned.has(item.id)}
          commands={rowCommands(item, env.deps)}
          projectName={named ? item.project : undefined}
          onSelect={() => selectRailItem(item, env.selection)}
        />
      ))}
    </>
  );
}

/** One project: its header, then its rows unless it is folded. */
export function ProjectSection({
  group,
  folded,
  env,
}: {
  readonly group: RailGroup;
  readonly folded: boolean;
  readonly env: RailRowEnv;
}) {
  return (
    <section aria-label={group.label}>
      <ProjectRailHeader
        group={group}
        folded={folded}
        onToggle={() => toggleProjectFolded(group.key)}
      />
      {folded ? null : <RailRows items={group.items} env={env} named={false} />}
      {!folded && group.items.length === 0 ? (
        <p className="px-5 py-2 text-xs text-muted-foreground">No sessions</p>
      ) : null}
    </section>
  );
}

/** A status or time bucket: a plain head with its count over rows that name their project. */
export function FlatSection({
  group,
  env,
}: {
  readonly group: RailGroup;
  readonly env: RailRowEnv;
}) {
  return (
    <section aria-label={group.label}>
      <h3 className="mx-3.5 mt-3 mb-0.5 flex items-center gap-1.5 text-2xs font-medium text-muted-foreground">
        {group.label}
        <span className="tabular-nums">{group.count}</span>
      </h3>
      <RailRows items={group.items} env={env} named />
    </section>
  );
}
