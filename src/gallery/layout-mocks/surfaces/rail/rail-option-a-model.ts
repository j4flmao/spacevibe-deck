import {
  AGENTS,
  CHECKOUTS,
  PROJECTS,
  placeOf,
  type MockAgent,
  type MockProject,
} from "../../layout-fixture";

/** One flat-inbox row: a fixture agent plus the lifecycle flags this option edits. */
export interface FlatRow {
  readonly id: string;
  readonly agent: MockAgent;
  readonly project: MockProject;
  readonly branch: string | null;
  readonly path: string;
  /** The user's own name; null falls back to the agent's sentence. */
  readonly label: string | null;
  readonly pinned: boolean;
  readonly archived: boolean;
  /** True for a row created here, which the board cannot focus. */
  readonly local: boolean;
}

export type FlatSection = "pinned" | "needs" | "working" | "unread" | "quiet";

export const SECTION_ORDER: readonly FlatSection[] = [
  "pinned",
  "needs",
  "working",
  "unread",
  "quiet",
];

export const SECTION_TITLE: Readonly<Record<FlatSection, string>> = {
  pinned: "Pinned",
  needs: "Needs you",
  working: "Working",
  unread: "Unread",
  quiet: "Quiet",
};

export const REPOSITORIES = PROJECTS.filter((project) => project.kind === "repository");

export function sectionOf(row: FlatRow): FlatSection {
  if (row.pinned) return "pinned";
  switch (row.agent.state) {
    case "failed":
    case "needs-you":
      return "needs";
    case "working":
      return "working";
    case "unchecked":
      return "unread";
    default:
      return "quiet";
  }
}

export function seedRows(): readonly FlatRow[] {
  const rows = AGENTS.map((agent): FlatRow => {
    const { project, checkout } = placeOf(agent);
    return {
      id: agent.id,
      agent,
      project,
      branch: checkout.branch,
      path: checkout.path,
      label: null,
      pinned: false,
      archived: false,
      local: false,
    };
  });
  // Seed one pinned and one archived row so every section shows on first paint.
  const pin = rows.find((row) => row.agent.state === "working");
  const old = rows.find((row) => row.agent.state === "ended" || row.agent.state === "idle");
  return rows.map((row) => ({
    ...row,
    pinned: row === pin,
    archived: row === old,
  }));
}

let counter = 0;

/** A fresh idle agent in the given place. */
export function newRow(
  base: MockAgent,
  place: Pick<FlatRow, "project" | "branch" | "path">,
): FlatRow {
  counter += 1;
  const id = `rail-flat-new-${counter}`;
  return {
    id,
    agent: {
      ...base,
      id,
      state: "idle",
      confidence: "explicit",
      sentence: null,
      ask: null,
      since: "now",
      terminal: [],
    },
    ...place,
    label: null,
    pinned: false,
    archived: false,
    local: true,
  };
}

export function worktreePath(repo: MockProject, branch: string): string {
  const root = CHECKOUTS.find((item) => item.projectId === repo.id)?.path ?? `~/code/${repo.name}`;
  return `${root}-worktrees/${branch.replace(/\//g, "-")}`;
}

export function matches(row: FlatRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  const hay = [row.label, row.agent.sentence, row.agent.ask, row.project.name, row.branch]
    .filter((part): part is string => part !== null)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

/** Rows asking the user to act; drives the footer count. */
export function attentionCount(rows: readonly FlatRow[]): number {
  return rows.filter(
    (row) =>
      !row.archived &&
      (row.agent.state === "needs-you" ||
        row.agent.state === "failed" ||
        row.agent.state === "unchecked"),
  ).length;
}
