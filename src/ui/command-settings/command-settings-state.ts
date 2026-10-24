import { signal } from "@preact/signals";
import type { CommandAreaId } from "../../settings/command-hits";
import type { Settings } from "../../settings/settings-schema";
import { isLiveKey } from "./command-settings-live";

/*
 * Command Settings keeps its state in module signals, like the screen it
 * replaces (R5): window-scoped and session-only, so reopening Settings returns
 * to the last area and nothing here is persisted. A leaf module on purpose:
 * `openSettingsAt` imports it, so it must not import that store back.
 */

/** The text in the one field. */
export const commandQuery = signal("");

/** The area the field is scoped to, or null for the whole index. */
export const commandScope = signal<CommandAreaId | null>(null);

/** The highlighted row, by key; the list falls back to its first row when it no longer holds it. */
export const commandActiveKey = signal<string | null>(null);

/**
 * Show one area with nothing typed: the entrance every deep link and every row takes. A key
 * with a live row there becomes the active row (the surface scrolls it into view); a key
 * edited by a legacy piece has no row of its own, so the area opens on its first row.
 */
export function revealInCommand(area: CommandAreaId, key?: keyof Settings): void {
  commandQuery.value = "";
  commandScope.value = area;
  commandActiveKey.value = key !== undefined && isLiveKey(key) ? `setting:${key}` : null;
}
