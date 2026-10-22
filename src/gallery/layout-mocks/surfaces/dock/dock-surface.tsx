import type { SurfaceSpec } from "../surface-types";
import { stackedSlots } from "./dock-stacked";
import { stripSlots } from "./dock-strip";
import { topTabsSlots } from "./dock-top-tabs";

export const DOCK_SURFACE: SurfaceSpec = {
  id: "dock",
  label: "Dock",
  today:
    "A right side panel (⌘⇧J) with three tabs (File explorer ⌘⇧B, Token usage ⌘⇧U, Session history ⌘⇧Y). It is a column that shrinks the stage, drag-resizable with a 360px floor. Changes is the explorer's second view, scoped to the tab's folder.",
  picked: "c",
  options: [
    {
      id: "a",
      label: "Top tabs",
      concept:
        "Today's column refined: Ask pinned above one tab row (Changes, Files, Usage, History) and In this space pinned below. OD-4: open by default, 320px, drag or arrow-key resize 295–440px; under 1360px it shrinks to 295px and the handle locks. OD-5: global tools stay in the rail footer.",
      area: ["chrome-only"],
      frame: "shell",
      slots: topTabsSlots,
    },
    {
      id: "b",
      label: "Vertical tool strip",
      concept:
        "A 44px icon strip on the far edge opens one tool beside it; clicking the active tool collapses to the strip, and the top button wears the agent's state mark. OD-4: open by default at 296px on wide windows; under 1360px it starts collapsed to the strip. OD-5: the strip's lower group takes Prompts, Browser and Settings out of the rail footer.",
      area: ["chrome-only"],
      frame: "shell",
      slots: stripSlots,
    },
    {
      id: "c",
      label: "Stacked sections",
      concept:
        "One scroll of collapsible sections (Ask, Changes, In this space, Usage, Files, History), nothing behind a tab. OD-4: open by default at a fixed 320px with no resize; under 1360px it becomes a 32px edge handle that opens a sheet over the stage with a scrim. OD-5: global tools stay in the rail footer.",
      area: ["chrome-only"],
      frame: "shell",
      slots: stackedSlots,
    },
  ],
};
