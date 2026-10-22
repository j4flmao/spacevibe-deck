import { isMarkedChanged, marksChange } from "./settings-changes";
import { SETTINGS_REGISTRY, type SettingsPage } from "./settings-registry";
import {
  DEFAULT_SETTINGS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  SCROLLBACK_CHOICES,
  type Settings,
  type TabBarPosition,
} from "./settings-schema";

type SettingKey = keyof Settings;

export interface SettingChoice<V extends string | number = string | number> {
  readonly value: V;
  readonly label: string;
}

/**
 * How a key is edited. A `menu` lists what the machine has (installed fonts,
 * installed apps), so it names its source rather than a list; `pins` is one
 * switch per agent under a row of its own. `agents` and `shortcuts` keys are
 * edited one agent or one action at a time inside those compound rows, never
 * as a row of their own; `none` is a key no Settings row edits (layout and
 * remembered state).
 */
export type SettingControl =
  | { readonly kind: "switch" }
  | { readonly kind: "choice"; readonly choices: readonly SettingChoice[] }
  | {
      readonly kind: "stepper";
      readonly min: number;
      readonly max: number;
      readonly step: number;
      readonly unit: string;
    }
  | { readonly kind: "text" }
  | { readonly kind: "menu"; readonly source: "fonts" | "apps" }
  | { readonly kind: "theme" }
  | { readonly kind: "pins" }
  | { readonly kind: "agents" }
  | { readonly kind: "shortcuts" }
  | { readonly kind: "none" };

export const TAB_BAR_CHOICES = [
  { value: "left", label: "Left" },
  { value: "top", label: "Top" },
] as const satisfies readonly SettingChoice<TabBarPosition>[];

export const FONT_SIZE_STEPPER = {
  kind: "stepper",
  min: FONT_SIZE_MIN,
  max: FONT_SIZE_MAX,
  step: 1,
  unit: "px",
} as const satisfies SettingControl;

export function scrollbackLabel(lines: number): string {
  return lines >= 1000 ? `${lines / 1000}k lines` : `${lines} lines`;
}

const SWITCH: SettingControl = { kind: "switch" };
const AGENTS: SettingControl = { kind: "agents" };
const NONE: SettingControl = { kind: "none" };

/**
 * One control per `Settings` key, typed as a full `Record` like the registry,
 * so a new schema key fails `tsc` until it says how it is edited. A test holds
 * `none` to exactly the keys the registry gives no page.
 */
export const SETTING_CONTROLS: Readonly<Record<SettingKey, SettingControl>> = {
  fontFamily: { kind: "menu", source: "fonts" },
  fontSize: FONT_SIZE_STEPPER,
  themeId: { kind: "theme" },
  colorOverrides: NONE,
  focusExpand: NONE,
  showPaneBar: SWITCH,
  showStatusBar: SWITCH,
  agentNotifications: SWITCH,
  tabBarPosition: { kind: "choice", choices: TAB_BAR_CHOICES },
  sidebarWidth: NONE,
  sidebarCollapsed: NONE,
  externalAppId: { kind: "menu", source: "apps" },
  scrollback: {
    kind: "choice",
    choices: SCROLLBACK_CHOICES.map((lines) => ({ value: lines, label: scrollbackLabel(lines) })),
  },
  customAgents: AGENTS,
  launchProfiles: AGENTS,
  disabledAgents: AGENTS,
  quickAgentIds: { kind: "pins" },
  railOrder: NONE,
  defaultAgent: NONE,
  defaultLaunchProfiles: AGENTS,
  agentModels: AGENTS,
  agentRuntimeDefaults: AGENTS,
  agentSignalAdapters: AGENTS,
  signalAdaptersRevision: NONE,
  quickLaunchPromptExpanded: NONE,
  promptTemplates: NONE,
  browserHomeUrl: { kind: "text" },
  browserLastUrl: NONE,
  dockOpen: NONE,
  dockWidth: NONE,
  dockTab: NONE,
  keybindings: { kind: "shortcuts" },
  githubStarred: NONE,
};

/** Everything a row shows for one key, read from one settings snapshot. */
export interface SettingRow<K extends SettingKey = SettingKey> {
  readonly key: K;
  readonly label: string;
  readonly page: SettingsPage | null;
  readonly control: SettingControl;
  readonly value: Settings[K];
  /** The default a reset puts back. */
  readonly fallback: Settings[K];
  /** The changed mark: differs from the default and a page reset would put it back. */
  readonly changed: boolean;
  /**
   * What this row's own reset hands `resetSettingsKeys`: the key itself for a
   * preference, null for layout, data and state, which only the Reset page
   * rows reset (FBK-3).
   */
  readonly resetKeys: readonly SettingKey[] | null;
}

export function settingRow<K extends SettingKey>(key: K, current: Settings): SettingRow<K> {
  const entry = SETTINGS_REGISTRY[key];
  return {
    key,
    label: entry.label,
    page: entry.page,
    control: SETTING_CONTROLS[key],
    value: current[key],
    fallback: DEFAULT_SETTINGS[key],
    changed: isMarkedChanged(current, key),
    resetKeys: entry.scope === "preference" ? [key] : null,
  };
}

/** The per-agent map keys an agent row edits: on/off, signals, default command. */
export const AGENT_ROW_KEYS = [
  "disabledAgents",
  "agentSignalAdapters",
  "defaultLaunchProfiles",
] as const;

/** Whether one agent's own entries in `AGENT_ROW_KEYS` carry a changed mark. */
export function agentEntryChanged(agentId: string, current: Settings): boolean {
  const defaults = DEFAULT_SETTINGS;
  const adapter = (source: Settings): boolean | undefined =>
    source.agentSignalAdapters[agentId as keyof Settings["agentSignalAdapters"]];
  return (
    marksChange(
      "disabledAgents",
      current.disabledAgents.includes(agentId) !== defaults.disabledAgents.includes(agentId),
    ) ||
    marksChange("agentSignalAdapters", adapter(current) !== adapter(defaults)) ||
    marksChange(
      "defaultLaunchProfiles",
      current.defaultLaunchProfiles[agentId] !== defaults.defaultLaunchProfiles[agentId],
    )
  );
}
