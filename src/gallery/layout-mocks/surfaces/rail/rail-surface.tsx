import type { SurfaceSpec } from "../surface-types";
import { RAIL_A } from "./rail-option-a";
import { RAIL_B } from "./rail-option-b";
import { RAIL_C } from "./rail-option-c";
import { RAIL_D } from "./rail-option-d";

export const RAIL_SURFACE: SurfaceSpec = {
  id: "rail",
  label: "Rail",
  today:
    "A project, checkout and session tree with a Create row (Worktree, Folder, Agent) above it, a six-button footer and a usage-limit line, resizable and collapsible to a 52px avatar column.",
  picked: "c",
  options: [RAIL_A, RAIL_B, RAIL_C, RAIL_D],
};
