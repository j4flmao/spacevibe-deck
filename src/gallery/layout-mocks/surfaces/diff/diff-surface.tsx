import type { SurfaceSpec } from "../surface-types";
import { DiffDock } from "./diff-dock";
import { DiffQueue } from "./diff-queue";
import { DiffStage } from "./diff-stage";

export const DIFF_SURFACE: SurfaceSpec = {
  id: "diff",
  label: "Diff",
  today:
    "Pressing a Changes row opens a Monaco diff column beside the explorer (inside the dock). Line comments to the running agent are being built: select lines, press a chord, and a composer sends one line `In <path>:L<a>-L<b>: <comment>` to the checkout's agent pane by bracketed paste.",
  options: [
    {
      id: "a",
      label: "Dock-expanded diff",
      concept:
        "The dock widens to 560px and holds the file list and diff; the composer opens inline under the selection while the terminals stay visible.",
      area: ["chrome-only"],
      frame: "shell",
      slots: { dock: (agent) => <DiffDock agent={agent} /> },
    },
    {
      id: "b",
      label: "Stage diff",
      concept:
        "The diff takes the stage side by side with a slim file rail and a composer bar along the bottom; Esc returns to the terminals.",
      area: ["terminal-area"],
      frame: "shell",
      dock: "closed",
      slots: { stage: (agent) => <DiffStage agent={agent} /> },
    },
    {
      id: "c",
      label: "Hunk review queue",
      concept:
        "One hunk at a time in the stage with Next/Previous, mark reviewed and a progress count; the composer sits beside the hunk.",
      area: ["terminal-area"],
      frame: "shell",
      dock: "closed",
      slots: { stage: (agent) => <DiffQueue agent={agent} /> },
    },
  ],
};
