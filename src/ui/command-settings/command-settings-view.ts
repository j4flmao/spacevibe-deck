import { externalApp, type ExternalAppId } from "../../lib/external-app-catalog";
import { bindingOf, chordsForAction, resolveKeymap } from "../../lib/keybindings";
import { getDesktopEnvironment, type DesktopPlatform } from "../../lib/platform";
import { formatShortcutBinding } from "../../lib/shortcut-label";
import type {
  AttentionIssue,
  CommandAreaId,
  CommandHit,
  CommandItem,
} from "../../settings/command-hits";
import { buildCommandItems, type CommandSources } from "../../settings/command-search";
import { settingRow } from "../../settings/settings-rows";
import type { Settings } from "../../settings/settings-schema";
import { settings } from "../../settings/settings-store";
import { getTheme } from "../../settings/themes";
import type { ActionId } from "../../terminal/action-registry";
import { SETTINGS_CATEGORIES } from "../settings/settings-categories";
import { shortcutGroups } from "../settings/shortcut-groups";

/** The snapshot the list reads, taken from the live stores at render time. */
export function commandSources(): CommandSources {
  return {
    settings: settings.value,
    areas: SETTINGS_CATEGORIES.map(({ id, label }) => ({ id, label })),
    shortcuts: shortcutGroups(),
    platform: getDesktopEnvironment().platform,
  };
}

/**
 * What the field shows. With an area chosen and nothing typed, the area is its
 * own section: the sections still hold every control, and a hit row cannot edit
 * what it names yet, so listing rows there would leave a setting read-only.
 */
export function commandListItems(
  query: string,
  scope: CommandAreaId | null,
  sources: CommandSources,
): readonly CommandItem[] {
  if (query.trim() === "" && scope !== null) {
    return [{ type: "section", key: `section:${scope}`, area: scope }];
  }
  return buildCommandItems(query, scope, sources);
}

export function areaLabel(area: CommandAreaId, sources: CommandSources): string {
  return sources.areas.find((entry) => entry.id === area)?.label ?? area;
}

function settingValueText(key: keyof Settings, current: Settings): string {
  const { control, value } = settingRow(key, current);
  switch (control.kind) {
    case "switch":
      return value === true ? "On" : "Off";
    case "choice":
      return control.choices.find((choice) => choice.value === value)?.label ?? String(value);
    case "stepper":
      return `${String(value)}${control.unit}`;
    case "text":
    case "menu":
      return key === "externalAppId" ? externalApp(value as ExternalAppId).label : String(value);
    case "theme":
      return getTheme(String(value)).name;
    case "pins":
      return Array.isArray(value) ? `${value.length} pinned` : "";
    default:
      return "";
  }
}

function chordText(action: ActionId, sources: CommandSources): string {
  const keymap = resolveKeymap(sources.platform, sources.settings.keybindings);
  const chords = chordsForAction(keymap, action);
  if (chords.length === 0) {
    return "Unbound";
  }
  return chords
    .map((chord) => formatShortcutBinding(bindingOf(chord, action), platformOf(sources)))
    .join(" · ");
}

/** `CommandSources` carries the platform as a string; the formatter wants the app's own union. */
function platformOf(sources: CommandSources): DesktopPlatform {
  return sources.platform === "windows" ? "windows" : "macos";
}

/** The value a hit row prints beside its label; an area entry has none. */
export function hitValueText(hit: CommandHit, sources: CommandSources): string {
  switch (hit.kind) {
    case "setting":
      return settingValueText(hit.key, sources.settings);
    case "agent":
      return sources.settings.disabledAgents.includes(hit.agentId) ? "Off" : "On";
    case "shortcut":
      return chordText(hit.action, sources);
    default:
      return "";
  }
}

/** The sentence an attention row reads as. */
export function issueText(issue: AttentionIssue, sources: CommandSources): string {
  if (issue.kind === "reported") {
    return issue.title;
  }
  const names = issue.actions.map(
    (action) =>
      sources.shortcuts.flatMap((group) => group.rows).find((row) => row.action === action)
        ?.label ?? action,
  );
  const keys = formatShortcutBinding(bindingOf(issue.chord, issue.actions[0]), platformOf(sources));
  return `${keys} is bound to ${names.join(" and ")}`;
}
