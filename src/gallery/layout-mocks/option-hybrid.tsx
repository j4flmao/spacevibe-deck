import { BrowserIcon } from "@hugeicons/core-free-icons";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { agentById } from "./layout-fixture";
import { OptionInbox } from "./option-inbox";
import type { OptionProps } from "./option-props";
import { Glyph, ToolButton } from "./surfaces/browser/browser-chrome";
import { BrowserPaired } from "./surfaces/browser/browser-option-d";
import { TreeChanges } from "./surfaces/changes/changes-tree";
import { diffFiles } from "./surfaces/diff/diff-data";
import { DiffQueue } from "./surfaces/diff/diff-queue";
import { DockStacked } from "./surfaces/dock/dock-stacked";

type StageView =
  | { readonly kind: "panes" }
  | { readonly kind: "diff"; readonly agentId: string; readonly path?: string }
  | { readonly kind: "browser"; readonly agentId: string };

const PANES: StageView = { kind: "panes" };

/** `&stage=diff|browser` opens on that view of the focused agent, for captures. */
function initialView(agentId: string): StageView {
  const stage = new URLSearchParams(window.location.search).get("stage");
  return stage === "diff" || stage === "browser" ? { kind: stage, agentId } : PANES;
}

/**
 * The owner's surface picks composed into the inbox shell: the stacked-sections dock holds the
 * folder-tree Changes; pressing a file with a diff opens the hunk queue on the stage; the rail
 * footer's Browser opens the preview beside the focused agent's terminal. Each view goes back to
 * the panes through its own close (Esc, ⌘⇧D, ⌘⇧I); a view belongs to the agent it opened on.
 */
export function OptionHybrid({ initialFocus, overlay }: OptionProps) {
  const view = useSignal<StageView>(initialView(initialFocus));
  // A stage view folds the dock (the queue and the preview need the width); leaving it puts the
  // dock back as it was.
  const dock = useSignal(view.peek().kind === "panes");
  const dockBefore = useRef(true);
  const show = (next: StageView) => {
    if (view.peek().kind === "panes" && next.kind !== "panes") {
      dockBefore.current = dock.peek();
      dock.value = false;
    } else if (next.kind === "panes") dock.value = dockBefore.current;
    view.value = next;
  };
  // The shell owns focus; the slots report the agent they last rendered for the chords.
  const focused = useRef(initialFocus);
  const toPanes = () => show(PANES);
  const openDiff = (agentId: string, path?: string) => {
    if (diffFiles(agentById(agentId)).length > 0) show({ kind: "diff", agentId, path });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.metaKey || !event.shiftKey) return;
      const key = event.key.toLowerCase();
      // An open view closes itself on its own chord; this only opens.
      if (key === "d" && view.value.kind !== "diff") openDiff(focused.current);
      else if (key === "i" && view.value.kind !== "browser")
        show({ kind: "browser", agentId: focused.current });
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Signals and the ref are read at key time.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const browserOpen = (agentId: string) =>
    view.value.kind === "browser" && view.value.agentId === agentId;

  return (
    <OptionInbox
      initialFocus={initialFocus}
      overlay={overlay}
      dock={dock}
      slots={{
        stage: (agent) => {
          focused.current = agent.id;
          const current = view.value;
          if (current.kind === "panes" || current.agentId !== agent.id) return null;
          return current.kind === "diff" ? (
            <DiffQueue
              key={`${agent.id}:${current.path ?? ""}`}
              agent={agent}
              startPath={current.path}
              onClose={toPanes}
            />
          ) : (
            <BrowserPaired key={agent.id} agent={agent} onClose={toPanes} />
          );
        },
        dock: (agent, focus) => (
          <DockStacked
            agent={agent}
            onFocus={focus}
            changes={
              <TreeChanges
                key={agent.id}
                agent={agent}
                onOpen={(change) => {
                  if (change.hunks) openDiff(agent.id, change.path);
                }}
              />
            }
          />
        ),
        footer: (agent) => (
          <ToolButton
            label="Browser"
            keys={["⌘", "⇧", "I"]}
            pressed={browserOpen(agent.id)}
            onClick={() => {
              show(browserOpen(agent.id) ? PANES : { kind: "browser", agentId: agent.id });
            }}
          >
            <Glyph icon={BrowserIcon} />
          </ToolButton>
        ),
      }}
    />
  );
}
