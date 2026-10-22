import type { MockAgent } from "../../layout-fixture";
import type { PanelOption } from "../surface-types";
import { WorktreeDialog } from "./rail-option-d-controls";
import { IconRail } from "./rail-option-d-icons";
import { ExpandedRail } from "./rail-option-d-list";
import { useRailD } from "./rail-option-d-state";

function RailD({
  agent,
  focus,
}: {
  readonly agent: MockAgent;
  readonly focus: (id: string) => void;
}) {
  const s = useRailD();
  // A row made here has no fixture twin, so the board is only asked to focus the real ones.
  const pick = (id: string) => {
    s.picked.value = id;
    if (!id.startsWith("new-")) focus(id);
  };
  return (
    <div
      data-rail-d
      tabIndex={-1}
      className="flex h-full overflow-hidden bg-background text-foreground outline-none"
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        const typing = target.tagName === "INPUT";
        if (event.metaKey && !event.shiftKey && event.key.toLowerCase() === "b") {
          event.preventDefault();
          s.collapsed.value = !s.collapsed.value;
        } else if (event.key === "/" && !typing && !s.collapsed.value) {
          event.preventDefault();
          event.currentTarget.querySelector<HTMLElement>("[data-rail-search]")?.focus();
        }
      }}
    >
      {s.collapsed.value ? (
        <IconRail s={s} focusId={agent.id} onPick={pick} />
      ) : (
        <ExpandedRail s={s} focusId={agent.id} onPick={pick} />
      )}
      <WorktreeDialog s={s} />
    </div>
  );
}

export const RAIL_D: PanelOption = {
  id: "d",
  label: "Compact + icon rail",
  concept:
    "One-line rows in groups you make, a Pinned tier on top, details on hover; one toggle folds the same panel to a 52px column of agent logos with their state marks.",
  area: ["chrome-only"],
  frame: "panel",
  width: 300,
  render: (agent, focus) => <RailD agent={agent} focus={focus} />,
};
