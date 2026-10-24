import { useMemo } from "preact/hooks";
import { repositoryScans } from "../../repositories/repositories-store";
import { sessionEntries } from "../../sessions/sessions-store";
import { settings } from "../../settings/settings-store";
import { paneTails } from "../../terminal/session-tail-store";
import { activeTabIndex, tabViews } from "../../terminal/tabs-store";
import { buildAgentRail } from "../agent-rail-model";
import { sessionTitlesFor } from "../agent-rail-card-model";
import { isRailItemFocused } from "../project-rail/project-rail-model";
import { railItems, type RailItem } from "../rail-view-model";

/**
 * The rail row that holds the window's keyboard, or null when none does. It is built from the
 * same inputs `AgentRail` feeds `buildAgentRail`, so the dock and the rail name one agent the
 * same way (identity, state, title). Remembered projects add clusters with no rows, so the
 * workspace history is left out.
 */
export function useFocusedRailItem(): RailItem | null {
  const tabs = tabViews.value;
  const activeIndex = activeTabIndex.value;
  const scans = repositoryScans.value;
  const tails = paneTails.value;
  const sessions = sessionEntries.value;
  const railOrder = settings.value.railOrder;
  return useMemo(
    () =>
      railItems(
        buildAgentRail({
          tabs,
          activeIndex,
          scans,
          workspaceHistoryPaths: [],
          tails,
          titles: sessionTitlesFor(tabs, sessions),
          railOrder,
          now: Date.now(),
        }),
      ).find(isRailItemFocused) ?? null,
    [tabs, activeIndex, scans, tails, sessions, railOrder],
  );
}
