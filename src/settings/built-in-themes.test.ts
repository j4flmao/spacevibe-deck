import { describe, expect, it } from "vitest";
import { BUILT_IN_THEMES } from "./built-in-themes";
import {
  EDITOR_KEYS,
  isThemeColor,
  TERMINAL_KEYS,
  THEME_TYPES,
  UI_TOKEN_KEYS,
  type Theme,
} from "./theme-schema";

const GROUPS = [
  ["ui", UI_TOKEN_KEYS],
  ["terminal", TERMINAL_KEYS],
  ["editor", EDITOR_KEYS],
] as const;

describe("built-in themes", () => {
  it("gives every theme a unique id", () => {
    const ids = BUILT_IN_THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(BUILT_IN_THEMES)("declares every colour of $id as opaque hex", (theme: Theme) => {
    expect(THEME_TYPES).toContain(theme.type);
    for (const [group, keys] of GROUPS) {
      const colors: Readonly<Record<string, string>> = theme[group];
      // Exactly the schema's keys: a missing one would leave a token on the
      // previous theme's value, a stray one is a typo nothing reads.
      expect(Object.keys(colors).sort()).toEqual([...keys].sort());
      for (const key of keys) {
        expect(isThemeColor(colors[key]), `${theme.id} ${group}.${key}`).toBe(true);
      }
    }
  });
});
