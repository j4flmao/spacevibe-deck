import type { SurfaceSpec } from "../surface-types";
import { FlatChanges } from "./changes-flat";
import { TreeChanges } from "./changes-tree";
import { TurnChanges } from "./changes-turns";

export const CHANGES_SURFACE: SurfaceSpec = {
  id: "changes",
  label: "Changes",
  today:
    "The explorer's second view: each changed file with status and +/− against HEAD, for the tab's folder, with a Refresh. Pressing a row opens a Monaco diff column beside the explorer.",
  picked: "b",
  options: [
    {
      id: "a",
      label: "Flat list",
      concept:
        "One scannable list with a status filter, a sort and a total; chevron previews the first changed lines.",
      area: ["chrome-only"],
      frame: "panel",
      width: 340,
      render: (agent) => <FlatChanges key={agent.id} agent={agent} />,
    },
    {
      id: "b",
      label: "Folder tree",
      concept:
        "Directories fold and collapse, each carrying the roll-up count of what changed beneath it.",
      area: ["chrome-only"],
      frame: "panel",
      width: 340,
      focus: "a-rail-opencode",
      render: (agent) => <TreeChanges key={agent.id} agent={agent} />,
    },
    {
      id: "c",
      label: "By agent turn",
      concept:
        "Files grouped by the agent turn that wrote them, the focused agent's latest turn first and marked.",
      area: ["needs-new-signal"],
      frame: "panel",
      width: 340,
      render: (agent) => <TurnChanges key={agent.id} agent={agent} />,
    },
  ],
};
