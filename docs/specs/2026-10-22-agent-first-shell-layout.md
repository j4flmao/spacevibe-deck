# Agent-first shell layout (inbox rail and agent dock)

Date: 2026-10-22
Status: Direction under evaluation. The owner chose to explore a hybrid of two gallery mocks
on 2026-10-22; nothing is accepted for production, and no layout decision below is final until
the owner's eye review (AC-1). This specification does not claim shipped behavior.
Parent: [Deck-wide shadcn and Base UI migration](2026-10-21-shadcn-base-ui-migration.md), which
owns component technology, preset styling and the contrast floor. This record owns the shell
layout only.

## Purpose

The shadcn pilot's screens were an agent proposal: a chat transcript with a right-hand
inspector. Deck hosts live PTYs, so that template misstates the product. Before reworking the
shell, the owner asked for a scout of how about six reference apps that run several coding
agents lay out agents, agent state and switching. The scout notes stay outside the repository
because they name the studied apps.

The findings that shaped this direction:

- Most reference apps list a task container (a worktree or a thread); Deck already lists one
  row per agent, so the agent stays the organizing axis.
- Parallel agents are handled by routing attention, not by showing everything: a "next agent
  needing me" key, plus a view of the queue. Deck has the key (⌘⇧A) and lacks the view.
- Most apps draw "finished, not yet seen" apart from "waiting for your answer". Deck folds both
  into `asked`, although its source signals (`requested`, `warning`, `completed`) are separate.
- Review sits beside the agent and is scoped to its checkout, in every app studied.

## Options explored

Three mocks were built on one shared fixture so they differ in layout only:
[`src/gallery/layout-mocks/`](../../src/gallery/layout-mocks/) (a standalone gallery document,
`index.html?option=inbox|ribbon|filmstrip&mode=dark|light`).

| Option    | Shape                                                                                                  | Status                       |
| --------- | ------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Inbox     | Rail grouped by what each agent needs; attention switcher on ⌘⇧A                                        | Base of the hybrid           |
| Ribbon    | No rail; agents as a chip row in the top bar; agent-scoped dock                                         | Dock taken into the hybrid   |
| Filmstrip | Project column; stage keeps its split; every other agent as a text-snapshot card in a right column    | Not pursued for now          |

The hybrid is Inbox with Ribbon's dock: `?option=inbox` (dock open), `?option=inbox&dock=0`
(without it). Surface boards then compared options per functional surface
(`?surface=dock|changes|diff|browser`). `?option=hybrid` composes the picks into the inbox
shell: the stacked-sections dock holding the folder-tree Changes, the hunk review queue on the
stage, and the browser beside the focused agent's terminal (`&stage=diff|browser`).
`?option=inbox` keeps Ribbon's tabbed dock for comparison.

## Requirements of the hybrid

- **LAY-1 Agent rows, grouped by need.** One rail row per agent across every project, in four
  sections: Needs you (failed, needs input), Unread (finished, not yet seen), Working, Quiet
  (done, ended, idle; collapsed by default with a count). Inside a section rows keep a stable
  order; only a state change moves a row.
- **LAY-2 Row anatomy.** A state-mark column, the agent's logo, the agent's latest sentence
  (at most two lines), and a quiet meta line `project / branch`. A needs-input row shows its
  ask in place of the meta line. Time in state is right-aligned on every row.
- **LAY-3 Project filter.** "All projects" or one project, as a menu at the top of the rail.
  The project › checkout › session tree is no longer the primary navigation.
- **LAY-4 State vocabulary.** `asked` splits into needs input (`requested`, `warning`) and
  unread (`completed` not yet seen), each with its own mark. Explicit/inferred confidence
  stays visible. Derived from existing signals only: no new IPC, hook or store.
- **LAY-5 Stage unchanged in structure.** The focused agent's space fills the stage with its
  existing split tree. The bar above it is the breadcrumb `project / branch / space`, dropping
  the space crumb when it only repeats the project. Each agent pane keeps an identity header
  (logo, name, latest sentence).
- **LAY-6 Agent-scoped dock.** A right column that follows the focused agent, built as one
  scroll of collapsible sections with nothing behind a tab: Ask when it needs input, its
  checkout's Changes as a folder tree whose folders carry roll-up +/− counts, the other agents
  of its space, Usage (tokens, cost, the space's cost, time running), Files and History.
  Toggled from the stage bar.
- **LAY-7 Attention switcher.** An overlay listing only agents in Needs you, Unread and
  Working, each with a text snapshot preview of its pane; ↑/↓ move, Enter focuses the agent,
  Esc closes. It takes over Mission Control's overview role, which is slated for removal.
- **LAY-8 Visual floor.** Stock preset controls per the parent specification's UI-1. Every
  composition-chosen text pair meets WCAG 2.2 AA in light and dark. The only motion that loops
  is the working mark and the needs-input ripple, within the design language's §1 budget.
- **LAY-9 Window sizes.** The layout holds at 1440×900 and at 1280×800 with the dock open.

## Open decisions

Each decision carries the evidence from a second scout of seven more reference apps
(13 in total, read 2026-10-22). The evidence informs; it decides nothing.

- **OD-1 Tree or inbox.** The [navigation rail refresh](2026-10-06-navigation-rail-refresh.md)
  chose the project-first tree over an attention-first rail on 2026-10-06. Accepting LAY-1/3
  supersedes that decision; shipping the inbox as a second rail mode beside the tree is the
  alternative.
  _Reference evidence:_ 7 of 13 let the user switch between project and status grouping or
  filter by status; 2 default to status sections; the rest default to a project or workspace
  tree.
- **OD-2 ⌘⇧A.** Today it jumps straight to the pane that needs you (user guides document
  this). Options: the switcher replaces the jump, or a tap jumps and a hold opens the
  switcher. Either changes a documented shortcut.
  _Reference evidence:_ the most common pair is a tap "next needing me" key plus a separate
  queue view (an inbox, an activity list or a title-bar dropdown). One app has an
  attention-filtered hold-and-release switcher. Four let a permission or question be answered
  from the queue without opening the agent. In Deck that would need a structured reply
  channel per CLI, not keystrokes written into the PTY.
- **OD-3 Dock root.** The Explorer and Changes root today is the selected tab's
  `workspacePath`, fixed when the tab was created; LAY-6 needs the focused pane's checkout.
  Whether that re-rooting touches tab materialization must be confirmed before it is built.
  _Research, 2026-10-22 (origin/main 54eb4e5c):_ chrome-only. The root is the signal
  `activeWorkspace` (`src/files/file-surface-store.ts:293`), written from the selected tab's
  `workspacePath` (`src/ui/app.tsx:903-908`), which is "fixed for the tab's life and never
  re-derived from a pane's cwd" (`docs/internals/terminal.md:131-132`). The focused pane's cwd is
  already a reactive signal, `statusInfo.value.cwd` (`src/terminal/tab-manager.ts:636-640`), and
  the renderer already maps a path to its checkout by longest prefix (`worktreeForPath`, used in
  `src/ui/agent-rail-model.ts`). The dock therefore gets its own derived root signal (focused
  pane cwd → checkout, falling back to `activeWorkspace`) and feeds the existing
  `workspacePath` prop. It must not rewrite `activeWorkspace`: the file watcher and open file
  tabs key on it (`src/files/file-surface-controller.ts:212-219`). It becomes an R4 fork only if
  a cwd field is added to `PaneView` or `TabView` (`tab-manager.ts` `syncViews`). Open edges: the
  cwd is polled every 2 seconds, is null before the first poll or while a file surface has focus,
  and on Windows comes only from OSC 9;9; a cwd outside every known checkout needs a rule
  (Explorer must not fall back to `$HOME`).
  _Reference evidence:_ 11 of 13 scope the review panel to the selected agent or task. The two
  exceptions are a terminal-native app, whose diff is a pane scoped to the terminal's
  repository, and an editor, whose panels are project-wide.
- **OD-4 Dock default and width.** At 1280px the 300px rail and the 340px dock leave 640px
  for the stage. Default open or closed, and whether the dock narrows, are open.
  _Reference evidence:_ defaults are split. Widths cluster at 295–340px. Every app has an
  explicit narrow-window rule: a sheet, a full/split/hidden cycle, an overflow menu, a minimum
  terminal width, or showing only the active session.
  _Owner, 2026-10-22:_ open by default at a fixed 320px with no resize. Under 1360px the dock
  becomes a 32px edge handle that opens it as a sheet over the stage with a scrim. The
  browser's native view paints above every DOM layer, so while that sheet is open over a stage
  holding the browser, the view must yield or hide, as it already yields to the dev-server
  menu.
- **OD-5 Where the rail footer's tools go.** Session history, Token usage, Explorer, Prompts,
  Browser and Settings (design language §28) are not placed in the mock beyond Settings.
  _Reference evidence:_ there is no consensus: sidebar header, sidebar footer, title bar, or a
  right-side tool strip, which is used by the two most tool-heavy apps. A command palette
  exists in nearly all.
  _Owner, 2026-10-22:_ the global tools stay in the rail footer; the dock carries only the
  focused agent's sections.
- **OD-6 Space marks and ⌘1–9.** The mock's stage bar draws no space marks. Digits keep
  counting spaces unless the owner decides otherwise; routing them to rail rows goes through
  the tab seam and is a fork.
  _Reference evidence:_ 6 of 13 point the digits at the agent or task list, 2 at tabs, 2 at
  panes or tool windows, and 3 bind none.

## Constraints found by research

Read from `origin/main` 54eb4e5c; each line was re-read by the coordinator.

- **Chords (OD-2, AC-4).** `handleShortcut` is one capture-phase listener that swallows a matched
  chord before xterm (`src/terminal/tab-manager.ts:3153-3194`); bare keys are not bindable
  (`src/lib/keybindings.ts:282-320`), so a bare Esc, ←/→ or R must never be global because the
  agent CLIs use them. Collisions in the mock: ⌘⇧D is `split-column`
  (`src/terminal/default-keymaps.ts:88`), ⌘⇧G is `find-previous` (`:160`). Proposed:
  - dock toggle → the shipped `toggle-dock`, ⌘⇧J / Ctrl+Shift+J (`default-keymaps.ts:252`, `:439`);
  - diff open/close → a new registry action on ⌘⇧H / Ctrl+Shift+H, unbound in both keymaps
    (Hypothesis: no agent CLI binds it; check their keybinding docs); fallback ⌘⇧X;
  - ⌘⇧A, ⌘⇧I and ⌘⇧↵ are Deck's own and stay (`default-keymaps.ts:197`, `:213`, `:154`); ⌘⇧A
    changes behaviour only if OD-2 says so;
  - queue ←/→/R are local handlers active only while the diff surface owns focus, never when
    xterm does; each Esc path (switcher, composer, inspect pick, dock) needs an owner so it
    never reaches the PTY of an agent that needs it to interrupt.
- **Browser beside a pane (LAY-5, OD-4): chrome-only.** The renderer measures a placeholder and
  sends `browser_set_bounds` (`src/browser/browser-panel.tsx:55-100`,
  `electron/ipc/register-browser.ts:72-77`), so any element's rectangle can drive the view
  without touching the layout engine. Yield is one predicate, `browserPanelObscured`
  (`src/ui/app-policy.ts:24-34`); the dock sheet needs one more flag there. Limits: the host keeps
  one `WebContentsView` per window (`electron/browser/view.ts:102`), so two simultaneous
  browsers are an R6 fork; the browser is a stage surface, not a split leaf, so "beside the
  terminal" needs a side slot in the stage markup, not a leaf in the tab layout. Hypotheses:
  `ResizeObserver` misses a move without a resize (split drag), so the hole may need a position
  poll; a native run decides.
- **Attention states (LAY-4): derivable, no new store.** `completed` is a latched attention kind
  cleared only by `acknowledge`, which runs on pane focus while the window is foreground
  (`src/terminal/agent-attention.ts:1109-1121`, `src/terminal/tab-manager.ts:747-752`), so
  Unread = `attention === "completed"`. Nothing about seen or attention is persisted: after a
  restart nothing is unread. Explicit `requested` and `completed` arrive only for claude, codex
  and opencode (hooks or plugin, `src/lib/agent-signal-map.ts:131-139`); the other 11 agents in
  `src/lib/agents/agent-registry.ts:31-46` get `requested` from OSC 9/777 or bell and
  `completed` only inferred, so their Unread mark is low-confidence. `warning` is explicit for
  every agent but comes only from OSC 9;4 severity warning, never a hook.
- **Dock Usage and History (LAY-6).** Buildable renderer-side: time running
  (`PaneView.startedAt`, `src/terminal/tabs-store.ts:88-95`), the pane's session id when known
  (`PaneView.sessionId`/`lastSessionId`, `:63`, `:104`; reported only for claude, codex hooks),
  History for one pane (`sessions_list` filtered by exact cwd and agent,
  `src/sessions/session-filters.ts:10-25`; Claude and Codex only), and repo-level usage and
  cost from the snapshot filtered by repo. Not buildable without a fork: per-session or
  per-pane tokens (`UsageBucket` has no session dimension, `electron/usage/model.ts:125-136`)
  and any usage for the 12 agents other than claude and codex (`UsageAgent`, `:107`). LAY-6's
  "its tokens" is therefore the repo's tokens for that agent until the owner approves a scanner
  change. A Usage dock tab and a Sessions dock tab already exist
  (`src/ui/usage/usage-dock-tab.tsx`, `src/ui/sessions/sessions-dock-tab.tsx`) and are global.

## Out of scope

The terminal grid, layout engine, tab materialization, PTY ownership, persistence and IPC
shapes. Ribbon's chip bar and Filmstrip, kept in the gallery as considered alternatives.

## Acceptance criteria

| ID   | Required evidence                                                                                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | The owner has reviewed the hybrid mock by eye (screenshots or the running gallery) and answered OD-1 to OD-6.                                                           |
| AC-2 | Section grouping and in-section order are a pure projection over existing tab views and attention state, with unit tests for grouping, order stability and the split. |
| AC-3 | The dock follows the focused agent across spaces and projects, including a pane whose checkout differs from its tab's folder.                                            |
| AC-4 | The switcher and ⌘⇧A behave as OD-2 decides, by keyboard and pointer; the user guides and keyboard-shortcut page match.                                                 |
| AC-5 | Measured text contrast meets AA for every composition-chosen pair in both modes; stock pairs below it follow the parent specification's contrast decision.             |
| AC-6 | No PTY, IPC, persistence or tab-materialization change. The affected design-language patterns (§27 rail, §28 footer, §35 spaces) are rewritten in the same change.     |
