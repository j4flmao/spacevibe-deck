import type { CommandHit } from "../../settings/command-hits";
import { SETTING_CONTROLS } from "../../settings/settings-rows";
import type { Settings } from "../../settings/settings-schema";

/*
 * Which settings a row edits in place. Every other kind (the theme cards, the
 * pinned agents) is edited by a legacy piece, so its hit stays a stand-in row
 * that opens the area. A leaf module: the state module needs it, and that one
 * must not reach a store.
 */

const LIVE_KINDS: ReadonlySet<string> = new Set(["switch", "choice", "stepper", "text", "menu"]);

export function isLiveKey(key: keyof Settings): boolean {
  return LIVE_KINDS.has(SETTING_CONTROLS[key].kind);
}

export function isLiveHit(hit: CommandHit): hit is CommandHit & { readonly kind: "setting" } {
  return hit.kind === "setting" && isLiveKey(hit.key);
}

export const rowDomId = (key: string): string => `command-row-${key}`;

/** Marks a row whose control is in the row: Enter moves focus into it, Escape brings it back. */
export const LIVE_ROW_ATTRIBUTE = "data-command-live-row";
