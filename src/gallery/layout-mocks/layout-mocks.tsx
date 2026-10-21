import { useSignal } from "@preact/signals";
import type { ComponentType } from "preact";
import { useLayoutEffect } from "preact/hooks";
import { Button } from "../../ui/controls/button";
import { ToggleGroup, ToggleGroupItem } from "../../ui/controls/toggle-group";
import { TooltipProvider } from "../../ui/controls/tooltip";
import { AGENTS, DEFAULT_FOCUS } from "./layout-fixture";
import { OptionFilmstrip } from "./option-filmstrip";
import { OptionInbox } from "./option-inbox";
import type { OptionProps } from "./option-props";
import { OptionRibbon } from "./option-ribbon";

const OPTIONS = [
  { id: "inbox", label: "Inbox", view: OptionInbox },
  { id: "ribbon", label: "Ribbon", view: OptionRibbon },
  { id: "filmstrip", label: "Filmstrip", view: OptionFilmstrip },
] as const satisfies readonly { id: string; label: string; view: ComponentType<OptionProps> }[];
type OptionId = (typeof OPTIONS)[number]["id"];

/**
 * URL contract, so every capture is reproducible:
 * `?option=inbox|ribbon|filmstrip&mode=dark|light&overlay=<name>&focus=<agent id>&bare=1`.
 * `bare=1` hides the switcher for screenshots.
 */
export function LayoutMocks() {
  const params = new URLSearchParams(window.location.search);
  const option = useSignal<OptionId>(
    OPTIONS.find((item) => item.id === params.get("option"))?.id ?? "inbox",
  );
  const dark = useSignal(params.get("mode") !== "light");
  const focusParam = params.get("focus");
  const initialFocus = AGENTS.some((agent) => agent.id === focusParam)
    ? (focusParam as string)
    : DEFAULT_FOCUS;
  const overlay = params.get("overlay");
  const bare = params.get("bare") === "1";

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", dark.value);
    document.documentElement.style.colorScheme = dark.value ? "dark" : "light";
    const url = new URL(window.location.href);
    url.searchParams.set("option", option.value);
    url.searchParams.set("mode", dark.value ? "dark" : "light");
    window.history.replaceState(null, "", url);
  }, [dark.value, option.value]);

  const View = OPTIONS.find((item) => item.id === option.value)?.view ?? OptionInbox;

  return (
    <TooltipProvider>
      <div className="h-full bg-background text-foreground">
        <View key={option.value} initialFocus={initialFocus} overlay={overlay} />
      </div>
      {bare ? null : (
        <div className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
          <ToggleGroup
            aria-label="Layout option"
            value={[option.value]}
            onValueChange={(next: unknown[]) => {
              const picked = OPTIONS.find((item) => item.id === next[0]);
              if (picked) option.value = picked.id;
            }}
          >
            {OPTIONS.map((item) => (
              <ToggleGroupItem key={item.id} value={item.id} size="sm">
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              dark.value = !dark.value;
            }}
          >
            {dark.value ? "Light" : "Dark"}
          </Button>
        </div>
      )}
    </TooltipProvider>
  );
}
