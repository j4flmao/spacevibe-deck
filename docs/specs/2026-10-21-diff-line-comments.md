# Diff line comments to a running agent

Date: 2026-10-21
Status: Approved by the owner on 2026-10-21. This reverses CHG5's "nothing is typed into any
pane" for this one flow, which the [Explorer and Changes spec](2026-10-10-explorer-and-changes.md)
had left to "a separate, later decision" with "its own agreed target and delivery behaviour".
Also approved: gated auto-submit (DLC10), the new-agent target staying out of scope.
Source: `/scout decide` of a reference app (source-available; ideas only, nothing copied).
Earlier sketch: task 3 of the gitignored 2026-09-24 changes-panel plan (paste unsent); this spec
replaces it with gated auto-submit.
Execution: [implementation plan](../plans/2026-10-21-diff-line-comments.md) (gitignored, primary
checkout only).

## Purpose

After an agent's turn, the owner reads the diff in the Changes column and wants to point at
specific lines: "this branch is wrong", "rename this". Today that means retyping the path and
line numbers into the agent's terminal by hand. This flow sends one located comment from the
diff straight into the agent that works in that checkout. Deck stays read-only towards git.

## Requirements

### Selecting lines

- **DLC1**: In the diff column, the user selects one or more lines and opens a comment composer
  from a keyboard chord or a pointer affordance on the selection. The chord must not shadow an
  existing Deck chord or a readline key (DIFF3's rule); it is a registry action (R3).
- **DLC2**: The location is snapshotted when the composer opens. A diff refresh (DIFF5) while
  the composer is open does not change what will be sent.
- **DLC3**: Line semantics:
  - Lines on the new side, and unchanged lines on the old side, are named by their **new-file**
    line numbers: the agent reads the working tree.
  - A selection made only of deleted lines is named by **old-file** numbers with the suffix
    ` (deleted lines)`; for a renamed file it names the old path.
  - A selection spanning deleted and new lines is named by the new-file range it touches with
    the suffix ` (across deletions and additions)`.
  - Added, untracked and deleted files (one-sided editors, DIFF4) follow the same rules.
  - In the narrow unified layout deleted lines are not selectable; commenting on them needs
    the side-by-side layout. Binary and over-limit files offer no composer.

### Payload

- **DLC4**: Exactly one line of text:
  `In <path>:L<a>[-L<b>][ <suffix>]: <comment>` — `L<a>` alone for a single line. `<path>` is
  root-relative with `/` separators. No hunk text is included; the agent reads the file.
- **DLC5**: The comment's line breaks collapse to spaces. Terminal controls and escape
  sequences are stripped from the whole payload before it reaches a pane. An empty comment
  cannot be sent.

### Target

- **DLC6**: Candidates are the live agent panes the rail groups under the diff's checkout. A
  path prefix is not enough: a worktree can sit inside the primary checkout
  (`.claude/worktrees/<slug>`), and its agents belong to that worktree, not to the primary.
- **DLC7**: One candidate is preselected. With several, the last pane picked for that
  checkout in this window is preselected while it is still alive; otherwise the user picks.
  No candidate → the composer explains there is no agent in this checkout and cannot send.
  This slice never launches an agent.

### Delivery

- **DLC8**: The target is captured when the composer opens: pane, agent and agent process.
  Immediately before pasting, Deck re-checks that the pane still runs that same agent process.
  If not, nothing is written and the comment stays in the composer with a reason.
- **DLC9**: The payload goes in as one bracketed paste through the existing pane paste path.
- **DLC10**: Enter is a separate write, sent 500 ms after the paste and only if, at that
  moment, the pane still runs the captured agent process, the agent reads idle, and no
  attention latch (permission, warning, error) appeared since the paste — the existing
  Prompt Board submit gate plus the process check. Otherwise the text stays in the agent's
  composer unsent and the user is told so.
- **DLC11**: Sends to the same pane are serialized: a second comment waits for the first
  delivery to finish, never interleaves with it and is never dropped as busy.
- **DLC12**: Never writes to a pane that is not an agent; never stages, commits or reverts.

### Composer

- **DLC13**: Send with ⌘↵ (Ctrl+Enter on Windows) or the send control; Esc discards the
  composer first and only then reaches DIFF1's column close. Focus returns to the diff.
- **DLC14**: The composer uses existing design tokens and colour roles; it adds none.
  Its look is chosen by the owner from gallery specimens.

## Acceptance

- Focused unit tests cover: single line, range, deleted-only (incl. rename), across
  deletions/additions, unchanged old-side lines mapped to new numbers, control and escape
  stripping, newline collapse, empty comment rejected.
- Target tests cover: one candidate, several with and without a remembered pick, the
  remembered pane gone, a nested worktree's agent excluded from the primary's candidates.
- Delivery tests cover: binding lost before paste → nothing written; binding lost or a latch
  raised during the 500 ms → pasted, not sent; working agent → pasted, not sent; two rapid
  sends to one pane → both delivered, in order; existing Prompt Board and Agent Board
  delivery unchanged.
- The owner approves a screenshot of the composer in the running app before the UI commit.
- The user guide's Changes paragraph and its `vi` translation describe the flow.
- On request only (E2E is opt-in since 2026-10-20): a real Claude Code and Codex pane receive
  a comment and submit it.

## Out of scope

Launching a new agent with the comment (blocked: `TASK_PROMPT_STAGING_ENABLED` is off and
typed launch commands admit no quotes by design); posting comments to GitHub; storing comment
threads or batching several comments into one send; comments from the file editor rather
than the diff; any git write.
