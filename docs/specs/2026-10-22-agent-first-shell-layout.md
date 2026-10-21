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
(without it).

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
- **LAY-6 Agent-scoped dock.** A right column that follows the focused agent: its checkout's
  Changes (status, path, +/−, total), an Ask block when it needs input, the other agents of its
  space, and a Session tab (state, time, tokens, cost, PR). Toggled from the stage bar.
- **LAY-7 Attention switcher.** An overlay listing only agents in Needs you, Unread and
  Working, each with a text snapshot preview of its pane; ↑/↓ move, Enter focuses the agent,
  Esc closes. It takes over Mission Control's overview role, which is slated for removal.
- **LAY-8 Visual floor.** Stock preset controls per the parent specification's UI-1. Every
  composition-chosen text pair meets WCAG 2.2 AA in light and dark. The only motion that loops
  is the working mark and the needs-input ripple, within the design language's §1 budget.
- **LAY-9 Window sizes.** The layout holds at 1440×900 and at 1280×800 with the dock open.

## Open decisions

- **OD-1 Tree or inbox.** The [navigation rail refresh](2026-10-06-navigation-rail-refresh.md)
  chose the project-first tree over an attention-first rail on 2026-10-06. Accepting LAY-1/3
  supersedes that decision; shipping the inbox as a second rail mode beside the tree is the
  alternative.
- **OD-2 ⌘⇧A.** Today it jumps straight to the pane that needs you (user guides document
  this). Options: the switcher replaces the jump, or a tap jumps and a hold opens the
  switcher. Either changes a documented shortcut.
- **OD-3 Dock root.** The Explorer and Changes root today is the selected tab's
  `workspacePath`, fixed when the tab was created; LAY-6 needs the focused pane's checkout.
  Whether that re-rooting touches tab materialization must be confirmed before it is built.
- **OD-4 Dock default and width.** At 1280px the 300px rail and the 340px dock leave 640px
  for the stage. Default open or closed, and whether the dock narrows, are open.
- **OD-5 Where the rail footer's tools go.** Session history, Token usage, Explorer, Prompts,
  Browser and Settings (design language §28) are not placed in the mock beyond Settings.
- **OD-6 Space marks and ⌘1–9.** The mock's stage bar draws no space marks. Digits keep
  counting spaces unless the owner decides otherwise; routing them to rail rows goes through
  the tab seam and is a fork.

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
