import type { Theme } from "./theme-schema";

/**
 * Deck's own dark theme: a neutral-black stage under a `#141414` sidebar.
 *
 * The stage colour is mirrored by the window's pre-render ground
 * (`backgroundColor` in `electron/main.ts`, `INITIAL_OVERLAY_COLORS`,
 * `FALLBACK_BG` in `src/lib/theme-vars.ts` and `:root` in `01-tokens.css`), so
 * the first frame matches it; change them together.
 */
export const DECK_DARK_THEME: Theme = {
  id: "deck-dark",
  name: "Deck Dark",
  type: "dark",
  ui: {
    bg: "#0a0a0a",
    fg: "#e7e7e7",
    accent: "#6f9cff",
    red: "#ef6b73",
    green: "#8ccf7e",
    yellow: "#e5c07b",
    magenta: "#c792ea",
    cyan: "#63c5da",
    "sidebar-bg": "#141414",
    "chrome-1": "#1b1b1b",
    "chrome-2": "#222222",
    "input-bg": "#0f0f0f",
    "text-primary": "#e7e7e7",
    "text-muted": "#ababab",
    "text-faint": "#949494",
  },
  terminal: {
    background: "#0a0a0a",
    foreground: "#e7e7e7",
    cursor: "#e7e7e7",
    cursorAccent: "#0a0a0a",
    selectionBackground: "#303030",
    black: "#202228",
    red: "#ef6b73",
    green: "#8ccf7e",
    yellow: "#e5c07b",
    blue: "#6f9cff",
    magenta: "#c792ea",
    cyan: "#63c5da",
    white: "#d8dee9",
    brightBlack: "#5d6470",
    brightRed: "#ff7a82",
    brightGreen: "#9bdd8d",
    brightYellow: "#f1d18a",
    brightBlue: "#86adff",
    brightMagenta: "#d5a3f3",
    brightCyan: "#7bd7ea",
    brightWhite: "#ffffff",
  },
  editor: {
    background: "#0a0a0a",
    foreground: "#e7e7e7",
    cursor: "#e7e7e7",
    selection: "#303030",
    lineHighlight: "#1b1b1b",
    lineNumber: "#949494",
    lineNumberActive: "#ababab",
    indentGuide: "#222222",
    comment: "#949494",
    keyword: "#c792ea",
    string: "#8ccf7e",
    number: "#e5c07b",
    type: "#63c5da",
    variable: "#e7e7e7",
    variablePredefined: "#6f9cff",
    delimiter: "#ababab",
    tag: "#ef6b73",
    attributeName: "#6f9cff",
    attributeValue: "#8ccf7e",
    regexp: "#ef6b73",
    invalid: "#ef6b73",
  },
};

/** Every theme Deck ships, the default first. */
export const BUILT_IN_THEMES: readonly Theme[] = [DECK_DARK_THEME];
