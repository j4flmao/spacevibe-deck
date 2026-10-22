import { useSignal } from "@preact/signals";
import {
  AGENTS,
  STATE_RANK,
  placeOf,
  wantsUser,
  AGENT_NAME,
  type MockAgent,
  type MockState,
} from "../../layout-fixture";

export interface RailItem {
  readonly agent: MockAgent;
  readonly group: string;
  readonly pinned: boolean;
  readonly archived: boolean;
  /** The user's own name for the row, else the agent's latest sentence. */
  readonly name: string | null;
  /** Set by Mark read / Mark unread; else the agent's own state stands. */
  readonly read: boolean | null;
}

export interface RailGroup {
  readonly id: string;
  readonly name: string;
  readonly folded: boolean;
}

const SEED_GROUPS: readonly RailGroup[] = [
  { id: "g-deck", name: "Deck", folded: false },
  { id: "g-bench", name: "Bench", folded: false },
  { id: "g-scratch", name: "Scratch", folded: false },
];
const GROUP_OF_PROJECT: Readonly<Record<string, string>> = {
  deck: "g-deck",
  bench: "g-bench",
  tiny: "g-scratch",
};

/** Everything the compact rail edits, kept local: nothing persists. */
export function useRailD() {
  const items = useSignal<readonly RailItem[]>(
    AGENTS.map((agent) => ({
      agent,
      group: GROUP_OF_PROJECT[placeOf(agent).project.id] ?? "g-scratch",
      pinned: agent.id === "a-auth-claude",
      archived: false,
      name: null,
      read: null,
    })),
  );
  const groups = useSignal<readonly RailGroup[]>(SEED_GROUPS);
  const collapsed = useSignal(false);
  const query = useSignal("");
  const editing = useSignal<string | null>(null);
  const picked = useSignal<string | null>(null);
  const archivedOpen = useSignal(false);
  const worktreeOpen = useSignal(false);
  const dragId = useSignal<string | null>(null);
  return {
    items,
    groups,
    collapsed,
    query,
    editing,
    picked,
    archivedOpen,
    worktreeOpen,
    dragId,
  };
}

export type RailD = ReturnType<typeof useRailD>;

/** The state the row shows: a manual read mark wins over the agent's own `unchecked`. */
export function shownState(item: RailItem): MockState {
  if (item.read === false) return "unchecked";
  if (item.read === true && item.agent.state === "unchecked") return "done";
  return item.agent.state;
}

export function titleOf(item: RailItem): string {
  return item.name ?? item.agent.sentence ?? AGENT_NAME[item.agent.kind];
}

export function matches(item: RailItem, query: string): boolean {
  const text = query.trim().toLowerCase();
  if (text === "") return true;
  const { project, checkout } = placeOf(item.agent);
  return `${titleOf(item)} ${AGENT_NAME[item.agent.kind]} ${project.name} ${checkout.branch ?? ""}`
    .toLowerCase()
    .includes(text);
}

export function liveItems(s: RailD): RailItem[] {
  return s.items.value.filter((item) => !item.archived && matches(item, s.query.value));
}

export function archivedItems(s: RailD): RailItem[] {
  return s.items.value.filter((item) => item.archived && matches(item, s.query.value));
}

/** Rows that ask the user to act or look, ignoring search: the count never hides. */
export function attentionCount(s: RailD): number {
  return s.items.value.filter((item) => !item.archived && wantsUser(shownState(item))).length;
}

/** Icon-rail order: rows that want you first, then the list order. Stable inside each tier. */
export function iconOrder(items: readonly RailItem[]): RailItem[] {
  const rank = (item: RailItem) => (wantsUser(shownState(item)) ? STATE_RANK[shownState(item)] : 0);
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(b.item) - rank(a.item) || a.index - b.index)
    .map((entry) => entry.item);
}

/** Puts focus back on the list once the control that held it has gone, so the panel keeps its keys. */
export function focusList() {
  requestAnimationFrame(() =>
    document.querySelector<HTMLElement>('[data-rail-d] [data-rail-item][tabindex="0"]')?.focus(),
  );
}

export function patch(s: RailD, id: string, change: Partial<RailItem>) {
  focusList();
  s.items.value = s.items.value.map((item) =>
    item.agent.id === id ? { ...item, ...change } : item,
  );
}

/** Moves `id` before `beforeId` (or to the end when null) and into that row's group. */
export function moveItem(s: RailD, id: string, beforeId: string | null, group?: string) {
  const list = s.items.value;
  const moving = list.find((item) => item.agent.id === id);
  if (!moving || id === beforeId) return;
  const rest = list.filter((item) => item.agent.id !== id);
  const target = beforeId === null ? null : rest.find((item) => item.agent.id === beforeId);
  const next = { ...moving, group: group ?? target?.group ?? moving.group };
  const at = target ? rest.indexOf(target) : rest.length;
  s.items.value = [...rest.slice(0, at), next, ...rest.slice(at)];
}

/** One step up or down among the rows of the same group. */
export function nudgeItem(s: RailD, id: string, step: -1 | 1) {
  const list = s.items.value;
  const me = list.find((item) => item.agent.id === id);
  if (!me) return;
  const peers = list.filter((item) => item.group === me.group && !item.archived);
  const at = peers.indexOf(me) + step;
  if (at < 0 || at >= peers.length) return;
  if (step === -1) moveItem(s, id, peers[at].agent.id);
  else {
    const after = peers[at + 1];
    moveItem(s, id, after ? after.agent.id : null);
  }
}

export function nudgeGroup(s: RailD, id: string, step: -1 | 1) {
  const list = [...s.groups.value];
  const at = list.findIndex((group) => group.id === id);
  const to = at + step;
  if (at < 0 || to < 0 || to >= list.length) return;
  [list[at], list[to]] = [list[to], list[at]];
  s.groups.value = list;
}

export function patchGroup(s: RailD, id: string, change: Partial<RailGroup>) {
  s.groups.value = s.groups.value.map((group) =>
    group.id === id ? { ...group, ...change } : group,
  );
}

export function addGroup(s: RailD) {
  const id = `g-${Date.now()}`;
  s.groups.value = [...s.groups.value, { id, name: "New group", folded: false }];
  s.editing.value = id;
}

export function deleteGroup(s: RailD, id: string) {
  const rest = s.groups.value.filter((group) => group.id !== id);
  if (rest.length === 0) return;
  s.groups.value = rest;
  s.items.value = s.items.value.map((item) =>
    item.group === id ? { ...item, group: rest[0].id } : item,
  );
}

let created = 0;

/** A fresh idle row cloned from `like`; it has no fixture twin, so the board is not asked to focus it. */
export function addAgent(s: RailD, like: MockAgent, branch?: string) {
  created += 1;
  const id = `new-${created}`;
  const agent: MockAgent = {
    ...like,
    id,
    state: "idle",
    confidence: "explicit",
    sentence: null,
    ask: null,
    since: "now",
    terminal: [],
  };
  const group = s.groups.value[0].id;
  s.items.value = [
    { agent, group, pinned: false, archived: false, name: branch ?? null, read: null },
    ...s.items.value,
  ];
  s.picked.value = id;
}

/** ArrowUp/Down/Home/End over the `[data-rail-item]` elements inside `container`. */
export function rovingKeys(event: KeyboardEvent, container: HTMLElement) {
  const items = [...container.querySelectorAll<HTMLElement>("[data-rail-item]")];
  const index = items.indexOf(document.activeElement as HTMLElement);
  if (index < 0) return;
  const target =
    event.key === "ArrowDown"
      ? items[Math.min(index + 1, items.length - 1)]
      : event.key === "ArrowUp"
        ? items[Math.max(index - 1, 0)]
        : event.key === "Home"
          ? items[0]
          : event.key === "End"
            ? items[items.length - 1]
            : null;
  if (!target) return;
  event.preventDefault();
  target.focus();
}
