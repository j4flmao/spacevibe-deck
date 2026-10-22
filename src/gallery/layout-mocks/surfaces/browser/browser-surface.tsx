import type { SurfaceSpec } from "../surface-types";
import { BrowserStage } from "./browser-option-a";
import { BrowserBeside } from "./browser-option-b";
import { BrowserDock } from "./browser-option-c";
import { BrowserPaired } from "./browser-option-d";

const FOCUS = "a-filters-gemini";

export const BROWSER_SURFACE: SurfaceSpec = {
  id: "browser",
  label: "Browser",
  today:
    "A browser chip on the strip (⌘⇧I) whose surface is a native WebContentsView occupying the whole stage, opening on the home address from Settings. A dev-servers chip lists local servers to open in it. Inspect grabs an element for the agent.",
  picked: "d",
  options: [
    {
      id: "a",
      label: "Stage tab",
      concept:
        "The browser takes the stage with a full toolbar and a way back to the agent's terminals.",
      area: ["terminal-area"],
      focus: FOCUS,
      frame: "shell",
      slots: { stage: (agent) => <BrowserStage agent={agent} /> },
    },
    {
      id: "b",
      label: "Beside the terminal",
      concept:
        "The stage splits into the focused agent's terminal and its preview, and the address bar names the agent and port.",
      area: ["terminal-area"],
      focus: FOCUS,
      frame: "shell",
      dock: "closed",
      slots: { stage: (agent) => <BrowserBeside agent={agent} /> },
    },
    {
      id: "c",
      label: "Dock browser",
      concept:
        "The page lives in the right column with a device-width toggle while the terminals keep the stage.",
      area: ["chrome-only"],
      focus: FOCUS,
      frame: "shell",
      slots: { dock: (agent) => <BrowserDock agent={agent} /> },
    },
    {
      id: "d",
      label: "Beside, expands to the stage",
      concept:
        "b and a mixed: the preview opens beside the agent's terminal and zooms to the stage like a pane (⌘⇧↵) with the agent's state on its toolbar; sending an element from the stage puts the terminal back beside it.",
      area: ["terminal-area"],
      focus: FOCUS,
      frame: "shell",
      dock: "closed",
      slots: { stage: (agent) => <BrowserPaired agent={agent} /> },
    },
  ],
};
