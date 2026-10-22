import { signal } from "@preact/signals";
import { cn } from "cn";
import type { KeyboardEvent, PointerEvent } from "react";
import { ScrollArea } from "../../../../ui/controls/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../ui/controls/tabs";
import { Kbd, KbdGroup } from "../../../../ui/controls/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/controls/tooltip";
import { AGENT_NAME, type MockAgent } from "../../layout-fixture";
import {
  AgentIdentity,
  AskBlock,
  NARROW_BELOW,
  SECTION_LABEL,
  SpaceList,
  TOOLS,
  ToolBody,
  changeTotals,
  useWindowWidth,
} from "./dock-parts";

const MIN_WIDTH = 295;
const MAX_WIDTH = 440;
const DEFAULT_WIDTH = 320;
const KEY_STEP = 16;

/** Module-level so the width survives the dock being hidden and shown again. */
const dockWidth = signal(DEFAULT_WIDTH);

const clamp = (value: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));

function ResizeHandle({ locked }: { readonly locked: boolean }) {
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (locked) return;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    dockWidth.value = clamp(window.innerWidth - event.clientX);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (locked) return;
    const step = event.key === "ArrowLeft" ? KEY_STEP : event.key === "ArrowRight" ? -KEY_STEP : 0;
    if (!step) return;
    event.preventDefault();
    dockWidth.value = clamp(dockWidth.value + step);
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize dock"
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-valuenow={locked ? MIN_WIDTH : dockWidth.value}
      aria-disabled={locked}
      tabIndex={locked ? -1 : 0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      onDblClick={() => {
        dockWidth.value = DEFAULT_WIDTH;
      }}
      className={cn(
        "absolute inset-y-0 -left-[3px] z-10 w-1.5 outline-none",
        locked
          ? "cursor-default"
          : "cursor-col-resize hover:bg-ring/40 focus-visible:bg-ring/60 active:bg-ring/60",
      )}
    />
  );
}

function DockTopTabs({
  agent,
  onFocus,
}: {
  readonly agent: MockAgent;
  readonly onFocus: (id: string) => void;
}) {
  const narrow = useWindowWidth() < NARROW_BELOW;
  const sum = changeTotals(agent);
  const width = narrow ? MIN_WIDTH : dockWidth.value;
  return (
    <aside
      aria-label={`${AGENT_NAME[agent.kind]} dock`}
      style={{ width }}
      className="relative flex shrink-0 flex-col border-l bg-background"
    >
      <ResizeHandle locked={narrow} />
      <header className="flex h-10 shrink-0 items-center border-b px-3">
        <AgentIdentity agent={agent} />
      </header>
      <AskBlock agent={agent} onFocus={onFocus} />
      <Tabs defaultValue="changes" className="min-h-0 flex-1 gap-0">
        <TabsList variant="line" className="h-9 w-full justify-start gap-3 border-b px-3">
          {TOOLS.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger
                render={
                  <TabsTrigger value={tool.id} className="h-8 flex-none px-0.5 after:bottom-0" />
                }
              >
                {tool.label}
                {tool.id === "changes" && sum.files ? (
                  <span className="tabular-nums text-muted-foreground">{sum.files}</span>
                ) : null}
              </TooltipTrigger>
              <TooltipContent>
                {tool.label}
                <KbdGroup>
                  {tool.keys.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
        {TOOLS.map((tool) => (
          <TabsContent key={tool.id} value={tool.id} className="min-h-0">
            <ScrollArea className="h-full">
              <ToolBody tool={tool.id} agent={agent} onFocus={onFocus} />
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
      <section aria-label="In this space" className="shrink-0 border-t pb-1">
        <h3 className={cn(SECTION_LABEL, "m-0 px-3 pt-2 pb-0.5")}>In this space</h3>
        <SpaceList agent={agent} onFocus={onFocus} />
      </section>
    </aside>
  );
}

export const topTabsSlots = {
  dock: (agent: MockAgent, focus: (id: string) => void) => (
    <DockTopTabs agent={agent} onFocus={focus} />
  ),
};
