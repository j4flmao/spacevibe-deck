import { useSignal } from "@preact/signals";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "cn";
import { Badge } from "../../ui/controls/badge";
import { Button } from "../../ui/controls/button";
import { ScrollArea } from "../../ui/controls/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/controls/tooltip";
import { TrafficLights } from "./agent-parts";
import {
  AGENTS,
  PROJECTS,
  STATE_RANK,
  agentById,
  placeOf,
  projectById,
  spaceLabel,
  wantsUser,
} from "./layout-fixture";
import { FilmstripCard } from "./option-filmstrip-card";
import { FilmstripStage } from "./option-filmstrip-stage";
import type { OptionProps } from "./option-props";

/** The swap overlay opens right after the failed bench agent was swapped in from `token refresh`. */
const SWAP_FOCUS = "a-bench-codex";
const SWAP_FROM = "s-auth";

const monogram = (name: string) => name.replace("spacevibe-", "").charAt(0).toUpperCase();

export function OptionFilmstrip({ initialFocus, overlay }: OptionProps) {
  const swapped = overlay === "swap";
  const focusId = useSignal(swapped ? SWAP_FOCUS : initialFocus);
  const leftSpace = useSignal<string | null>(swapped ? SWAP_FROM : null);
  const filter = useSignal<string | null>(null);

  const focus = agentById(focusId.value);
  const { space, checkout, project } = placeOf(focus);

  const swapIn = (id: string) => {
    const next = placeOf(agentById(id)).space;
    leftSpace.value = space.id;
    focusId.value = id;
    if (next.id === space.id) leftSpace.value = null;
  };

  const cards = AGENTS.filter(
    (agent) =>
      agent.spaceId !== space.id &&
      (filter.value === null || placeOf(agent).project.id === filter.value),
  ).sort(
    (a, b) =>
      Number(b.spaceId === leftSpace.value) - Number(a.spaceId === leftSpace.value) ||
      STATE_RANK[b.state] - STATE_RANK[a.state],
  );

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="flex h-10 shrink-0 items-center gap-6 border-b bg-sidebar px-3">
        <TrafficLights />
        <nav aria-label="Location" className="flex min-w-0 items-center gap-1.5 text-xs">
          <span className="truncate text-muted-foreground">{project.name}</span>
          <span aria-hidden="true" className="text-muted-foreground">
            /
          </span>
          <span className="truncate font-mono text-muted-foreground">
            {checkout.branch ?? "no branch"}
          </span>
          {/* An unnamed space whose folder is its project drops the name crumb. */}
          {spaceLabel(space) === project.name ? null : (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                /
              </span>
              <span className="truncate font-medium text-foreground">{spaceLabel(space)}</span>
            </>
          )}
        </nav>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Projects"
          className="flex w-14 shrink-0 flex-col items-center gap-2 border-r bg-sidebar py-3"
        >
          {PROJECTS.map((item) => {
            const needing = AGENTS.filter(
              (agent) => placeOf(agent).project.id === item.id && wantsUser(agent.state),
            ).length;
            const active = filter.value === item.id;
            const current = item.id === project.id;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      aria-pressed={active}
                      aria-label={`${item.name}${needing ? `, ${needing} need you` : ""}${current ? ", current" : ""}`}
                      onClick={() => (filter.value = active ? null : item.id)}
                      className={cn(
                        "relative size-8 rounded-md font-mono text-sm font-semibold",
                        active
                          ? "bg-foreground text-background hover:bg-foreground hover:text-background"
                          : "bg-muted text-foreground hover:bg-accent",
                        current && "ring-2 ring-foreground ring-offset-2 ring-offset-sidebar",
                      )}
                    />
                  }
                >
                  {monogram(item.name)}
                  {needing ? (
                    <Badge
                      variant="outline"
                      className="absolute -top-1.5 -right-1.5 h-4 min-w-4 border-border bg-background px-1 text-[10px] text-foreground tabular-nums dark:bg-background"
                    >
                      {needing}
                    </Badge>
                  ) : null}
                </TooltipTrigger>
                <TooltipContent side="right">{item.name}</TooltipContent>
              </Tooltip>
            );
          })}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-lg" aria-label="New agent" className="mt-auto" />
              }
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={1.8} aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent side="right">New agent</TooltipContent>
          </Tooltip>
        </aside>
        <main className="flex min-h-0 min-w-0 flex-1">
          <FilmstripStage
            space={space}
            focusId={focusId.value}
            onFocus={(id) => (focusId.value = id)}
          />
        </main>
        <aside
          aria-label="Other agents"
          className="flex w-80 shrink-0 flex-col border-l bg-sidebar"
        >
          <div className="flex h-9 shrink-0 items-center justify-between px-3">
            <span className="text-xs font-medium text-foreground">
              Elsewhere <span className="text-muted-foreground tabular-nums">{cards.length}</span>
            </span>
            {filter.value ? (
              <Button variant="outline" size="xs" onClick={() => (filter.value = null)}>
                {projectById(filter.value).name.replace("spacevibe-", "")}
                <HugeiconsIcon icon={Cancel01Icon} aria-label="Clear filter" />
              </Button>
            ) : null}
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <ul className="flex flex-col gap-2 px-3 pb-3">
              {cards.map((agent, index) => {
                const left = agent.spaceId === leftSpace.value;
                const heading =
                  leftSpace.value === null
                    ? null
                    : left && index === 0
                      ? "Just left"
                      : !left && cards[index - 1]?.spaceId === leftSpace.value
                        ? "Others"
                        : null;
                return (
                  <li key={agent.id} className="flex flex-col gap-2">
                    {heading ? (
                      <h3 className="px-0.5 pt-1 text-[11px] font-medium text-muted-foreground">
                        {heading}
                      </h3>
                    ) : null}
                    <FilmstripCard agent={agent} onSwap={swapIn} />
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
