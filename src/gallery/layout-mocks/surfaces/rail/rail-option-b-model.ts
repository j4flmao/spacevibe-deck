import { AGENTS, STATE_RANK, placeOf, type MockAgent } from "../../layout-fixture";
import { SECTION_LABEL, SECTION_ORDER, sectionOf } from "../../option-inbox-model";

export type Grouping = "status" | "project" | "time";
export type Sorting = "priority" | "updated" | "manual";

export const GROUPING_LABEL: Readonly<Record<Grouping, string>> = {
  status: "By status",
  project: "By project",
  time: "By time",
};
export const SORTING_LABEL: Readonly<Record<Sorting, string>> = {
  priority: "Priority",
  updated: "Last updated",
  manual: "Manual",
};

/** A fixture agent plus the bits the rail lets the user change. */
export interface RailAgent extends MockAgent {
  readonly projectId: string;
  readonly branch: string | null;
  readonly path: string;
  readonly label: string | null;
  readonly pinned: boolean;
  readonly archived: boolean;
}

export function seedAgents(): RailAgent[] {
  return AGENTS.map((agent) => {
    const { project, checkout } = placeOf(agent);
    return {
      ...agent,
      projectId: project.id,
      branch: checkout.branch,
      path: checkout.path,
      label: null,
      pinned: false,
      archived: false,
    };
  });
}

const UNIT_SECONDS: Readonly<Record<string, number>> = { s: 1, m: 60, h: 3600, d: 86400 };

/** "38s", "12m", "3h" to seconds; unknown text sorts last. */
export function sinceSeconds(since: string): number {
  const match = /^(\d+)([smhd])$/.exec(since);
  return match ? Number(match[1]) * UNIT_SECONDS[match[2]] : Number.MAX_SAFE_INTEGER;
}

export interface Group {
  readonly key: string;
  readonly label: string;
  readonly projectId?: string;
  readonly rows: readonly RailAgent[];
}

const BUCKETS = [
  { key: "t1", label: "Last 5 minutes", max: 300 },
  { key: "t2", label: "Last 15 minutes", max: 900 },
  { key: "t3", label: "Earlier", max: Number.MAX_SAFE_INTEGER },
] as const;

export function displayTitle(agent: RailAgent, fallback: string): string {
  return agent.label ?? agent.sentence ?? fallback;
}

function sorted(rows: readonly RailAgent[], sorting: Sorting): RailAgent[] {
  const list = [...rows];
  if (sorting === "priority") {
    list.sort(
      (a, b) =>
        STATE_RANK[b.state] - STATE_RANK[a.state] || sinceSeconds(a.since) - sinceSeconds(b.since),
    );
  } else if (sorting === "updated") {
    list.sort((a, b) => sinceSeconds(a.since) - sinceSeconds(b.since));
  }
  return list;
}

/** Pinned rows form their own lane; the rest split by `grouping`. Empty groups drop out. */
export function buildGroups(
  rows: readonly RailAgent[],
  grouping: Grouping,
  sorting: Sorting,
  projects: readonly { id: string; name: string }[],
): Group[] {
  const pinned = rows.filter((row) => row.pinned);
  const rest = rows.filter((row) => !row.pinned);
  const lanes: Group[] = [{ key: "pinned", label: "Pinned", rows: sorted(pinned, sorting) }];
  if (grouping === "status") {
    for (const id of SECTION_ORDER) {
      lanes.push({
        key: id,
        label: SECTION_LABEL[id],
        rows: sorted(
          rest.filter((row) => sectionOf(row) === id),
          sorting,
        ),
      });
    }
  } else if (grouping === "project") {
    for (const project of projects) {
      lanes.push({
        key: project.id,
        label: project.name,
        projectId: project.id,
        rows: sorted(
          rest.filter((row) => row.projectId === project.id),
          sorting,
        ),
      });
    }
  } else {
    for (const bucket of BUCKETS) {
      const lower = BUCKETS[BUCKETS.indexOf(bucket) - 1]?.max ?? -1;
      lanes.push({
        key: bucket.key,
        label: bucket.label,
        rows: sorted(
          rest.filter((row) => {
            const age = sinceSeconds(row.since);
            return age > lower && age <= bucket.max;
          }),
          sorting,
        ),
      });
    }
  }
  return lanes.filter((lane) => lane.rows.length > 0);
}
