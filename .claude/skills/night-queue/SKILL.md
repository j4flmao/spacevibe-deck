---
name: night-queue
description: Queue a task for tonight's unattended night run on mxrsv/spacevibe-deck. Use when the owner asks, in any language, to hand work to the night shift ("tonight, fix X", "queue this for the night"), from a claude.ai session or a local one. Files one `claude-ready` issue; writes no code. Also cuts a shadcn migration lane into several small issues (section 5).
---

# Queue a night task

The night run (01:07 Asia/Saigon) takes the oldest open issue authored by `mxrsv` that carries
`claude-ready`, and opens one PR for it. Your job is to turn the owner's request into that issue.
The owner is here, so ask when the goal itself is unclear; otherwise fill the gaps from the code.

## 1. Shape the task

Write the Agent task form fields ([`agent-task.yml`](../../../.github/ISSUE_TEMPLATE/agent-task.yml)):

- **Goal:** one or two sentences, what is true when it is done.
- **Acceptance criteria:** one checkable line each, naming the command or check that proves it
  (`npm test -- <file>`, a visible state, a log line).
- **Where to look:** files or areas; search the repo to name them.
- **Out of scope:** what must not change.
- **Kind:** visible UI change, and whether it is a new surface or a changed UI flow.

## 2. Refuse what the night must not do

Say why, and suggest a day session instead, when the task:

- touches an area under [Forks](../../../AGENTS.md#forks), CI or workflow files, release, signing,
  updater, version or dependency configuration, secrets, auth, lint-only file splits, the night
  skills, or the "Unattended routine" section of `AGENTS.md`;
- could not be checked by the owner in about 5 minutes the next morning: split it, or keep it for
  a day session.

## 3. File it

Cloud sessions cannot use GraphQL, so `gh issue create` fails there; use REST everywhere. Write the
body to `/tmp/night-task.md`:

```
### Goal
<goal>

### Acceptance criteria
- [ ] <criterion and its check>

### Where to look
<files or areas>

### Out of scope
<what must not change>

### Kind
- [ ] Visible UI change (the PR needs screenshots)
- [ ] New surface or changed UI flow (the test-deck-app E2E gate applies)
```

Tick each Kind box from the task itself, not from this sample: the runner runs the E2E gate only
when the second box is ticked.

Never start the body with `night-shift-self:`; that marks the night's own picks. Create the issue
and its label in one call:

```
gh api -X POST repos/mxrsv/spacevibe-deck/issues -f title='[agent] <imperative title>' -F body=@/tmp/night-task.md -f 'labels[]=claude-ready' --jq '{number, html_url, labels: [.labels[].name]}'
```

GitHub silently drops labels it will not apply, so check the response: if `claude-ready` is
missing, add it with `gh api -X POST repos/mxrsv/spacevibe-deck/issues/<n>/labels -f 'labels[]=claude-ready'`.
If that fails too, tell the owner the issue is filed but not queued, with the error.
Post no comment on the issue: a `night-shift:` comment would make the night skip it.

## 4. Say when it runs

- Open night PRs: `gh api 'repos/mxrsv/spacevibe-deck/pulls?state=open&per_page=100'`, keeping
  those whose `head.repo.full_name` is `mxrsv/spacevibe-deck`, author `mxrsv` and `head.ref`
  matching `^claude/[0-9]+-`.
- Queue ahead of it: open issues by `mxrsv` carrying `claude-ready`, created earlier
  (`gh api 'repos/mxrsv/spacevibe-deck/issues?labels=claude-ready&state=open&creator=mxrsv&sort=created&direction=asc&per_page=100'`,
  dropping entries with a `pull_request` key).

The default runner does one task per run, oldest first, skips a task that already has an open night PR,
and starts nothing while 3 night PRs are open. A task with a `lane: <name>` line is taken only by that
lane's runner, one at a time per lane, so say how many nights a lane's slices need, not the set. Reply in the owner's language with the issue link
and one of: runs tonight; runs in about N nights; or waiting, because 3 night PRs are open and one
has to be merged or closed first.

## 5. Cut a migration lane into slices

For the shadcn Base UI migration ([`UI-1..UI-11`](../../../docs/specs/2026-10-21-shadcn-base-ui-migration.md),
[`LAY-12`, `LAY-13`](../../../docs/specs/2026-10-22-agent-first-shell-layout.md)) one lane is too
big for a night. Cut it into slices, each filed through section 3 with the same form fields. Draft
all of them to `~/scratch/spacevibe-deck/night-queue/<lane>-<n>-<slug>.md`, show the owner the
whole set, and file only after one yes for the set.

**Inventory the lane** from a checkout at `origin/main`, the clone the night will use:

```bash
D=<lane directories>
grep -rnE "<(button|input|select|textarea)\b" $D --include='*.tsx' | grep -v '\.test\.'
grep -rnoE "cfg-[a-z0-9_-]+" $D --include='*.tsx' | grep -v '\.test\.'
grep -rnE "text-\[[0-9.]+(px|rem)\]" $D
grep -rlE "cfg-|querySelector\(.select" $D --include='*.test.tsx'   # tests tied to legacy markup
ls src/ui/controls                                                  # what a slice may import
```

Before promising that a legacy class or its CSS can go, count its users repo-wide
(`grep -rlE "<class>" src --include='*.tsx'`, `src/gallery/` and `src/ui/controls/` included): a
shared control or another lane may still emit it.

**Each slice** is one concern (one control kind or one surface), names its files (about 6 source
files at most, plus tests), merges alone, and is checkable in about 5 minutes. It is import-only:
it never edits `src/ui/controls/*`, `src/ui/preset.css`, `src/ui/type-scale.css`, `package.json`,
`vite.config.ts`, `CHANGELOG.md` or `docs/DESIGN-LANGUAGE.md`. A slice that needs a new control,
variant or size is a day session: report the gap instead of drafting it. Migrated tests select by
`[data-slot="button"]`, `[role="switch"]` and `aria-disabled`, never by `cfg-*` classes, and
migrating them belongs to the slice.

**Two extra lines** above `### Goal`: `lane: <name>` and, only when a slice needs an earlier slice
of the same lane, `depends on: #<n>`. The runner does not read `depends on` (it takes the oldest
owner task), so file a dependent slice only after its predecessor's PR is merged. Under
`### Where to look` add `Checkpoint:` (what a partial result that is still mergeable looks like);
under `### Out of scope` list the files above as "Do not touch" and the stop conditions: a new
control is needed, a test cannot move to preset selectors, a DL invariant is touched. On any of
these the runner changes nothing further and posts a `night-shift:` comment with the question.

**Order**: lanes own disjoint directories and a slice depends only on its own lane. The slice that
deletes dead CSS goes last and removes only selectors the repo-wide grep shows have no users left.
Say how many nights the set needs, given the cap in section 4.
