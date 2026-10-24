import { SidebarSimple } from "@phosphor-icons/react";
import { AgentStateMark } from "../blocks/agent-state-mark";
import { displayAgent } from "../agent-rail-card-model";
import { Button } from "../controls/button";
import { DeckIcon, ROW_ICON } from "../controls/deck-icon";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../controls/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "../controls/tooltip";
import { statusLabel } from "../project-rail/project-rail-model";
import type { RailItem } from "../rail-view-model";
import { dockSheetOpen } from "./agent-dock-state";
import { DockColumn, type DockColumnProps } from "./dock-column";

const OPEN_LABEL = "Open the side panel";

/** The handle's accessible name: the way in, and which agent it would show. */
function handleLabel(item: RailItem | null): string {
  if (item === null || item.entry.kind !== "agent") {
    return OPEN_LABEL;
  }
  return `${OPEN_LABEL}, ${displayAgent(item.entry.agent)}, ${statusLabel(item)}`;
}

type DockEdgeProps = Pick<DockColumnProps, "item" | "bodies">;

/**
 * The narrow rule (LAY-9, OD-4): under 1360px the dock is a 32px handle, and opening it draws the
 * same column in a sheet over the stage with its scrim. Escape or the scrim closes it and focus
 * returns to the handle. The handle is the sheet's trigger, so Base UI owns that return.
 *
 * The sheet's own header control closes the sheet only; hiding the dock stays the toggle's job.
 */
export function DockEdge({ item, bodies }: DockEdgeProps) {
  const setOpen = (open: boolean): void => {
    dockSheetOpen.value = open;
  };
  return (
    <Sheet open={dockSheetOpen.value} onOpenChange={setOpen}>
      <div className="flex h-full flex-col items-center">
        <div aria-hidden="true" className="agent-dock__edge-head w-full" />
        <div className="flex flex-col items-center gap-2 py-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <SheetTrigger
                  render={<Button variant="ghost" size="icon" aria-label={handleLabel(item)} />}
                />
              }
            >
              <DeckIcon icon={SidebarSimple} size={ROW_ICON} mirrored />
            </TooltipTrigger>
            <TooltipContent side="left">{OPEN_LABEL}</TooltipContent>
          </Tooltip>
          {item === null ? null : (
            <AgentStateMark status={item.status} confidence={item.confidence} />
          )}
        </div>
      </div>
      <SheetContent
        showCloseButton={false}
        className="data-[side=right]:w-80 data-[side=right]:sm:max-w-80"
      >
        <SheetTitle className="sr-only">Side panel</SheetTitle>
        <DockColumn
          item={item}
          bodies={bodies}
          closeLabel="Close the side panel"
          closeChord={null}
          onClose={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
