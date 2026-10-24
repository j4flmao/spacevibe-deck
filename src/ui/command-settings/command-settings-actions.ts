import type {
  AttentionIssue,
  CommandAreaId,
  CommandHit,
  CommandItem,
} from "../../settings/command-hits";
import { settingsTarget } from "../settings/settings-focus-store";
import { commandActiveKey, commandScope, revealInCommand } from "./command-settings-state";

/*
 * What a press on a row or a chip does. The legacy sections mounted inside an
 * area paint a deep-linked row from `settingsTarget` (`ConfigRow` scrolls to it
 * and marks it), so the target is written here and cleared whenever the user
 * moves: a stale target would repaint when the area is entered again.
 */

/** A row of the home list or of results: open its area, and its row when it has one. */
export function openHit(hit: CommandHit): void {
  revealInCommand(hit.area);
  settingsTarget.value = hit.kind === "setting" ? hit.key : null;
}

export function openIssue(issue: AttentionIssue): void {
  revealInCommand(issue.area);
  settingsTarget.value = null;
}

/** Enter on the highlighted row. Heads, sections and the empty line have nothing to open. */
export function openItem(item: CommandItem): void {
  if (item.type === "hit") {
    openHit(item.hit);
  } else if (item.type === "attention") {
    openIssue(item.issue);
  }
}

/** An area chip: the typed text stays, so the field filters inside the area. */
export function chooseArea(area: CommandAreaId | null): void {
  settingsTarget.value = null;
  commandScope.value = area;
  commandActiveKey.value = null;
}
