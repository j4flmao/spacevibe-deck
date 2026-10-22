import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ComputerTerminal01Icon,
  CursorPointer01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { useSignal } from "@preact/signals";
import { Button } from "../../../../ui/controls/button";
import { Input } from "../../../../ui/controls/input";
import { Kbd, KbdGroup } from "../../../../ui/controls/kbd";
import { Separator } from "../../../../ui/controls/separator";
import { AgentStateMark } from "../../agent-parts";
import { AGENT_NAME, STATE_LABEL, type MockAgent } from "../../layout-fixture";
import { MockTerminal } from "../../mock-terminal";
import { DevServerSelect, Glyph, InspectBar, NativeView, ToolButton } from "./browser-chrome";
import { useBrowser } from "./browser-state";

/** Option a: the browser takes the whole stage; one button goes back to the terminals. */
export function BrowserStage({ agent }: { readonly agent: MockAgent }) {
  const browser = useBrowser("pick");
  const view = useSignal<"page" | "terminal">("page");
  const name = AGENT_NAME[agent.kind];

  if (view.value === "terminal") {
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b px-2">
          <Button variant="outline" onClick={() => (view.value = "page")}>
            Browser
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>⇧</Kbd>
              <Kbd>I</Kbd>
            </KbdGroup>
          </Button>
        </div>
        <MockTerminal lines={agent.terminal} className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1.5 border-b px-2">
        <Button
          variant="ghost"
          aria-label={`Back to ${name} terminals, ${STATE_LABEL[agent.state]}`}
          onClick={() => (view.value = "terminal")}
        >
          <Glyph icon={ComputerTerminal01Icon} />
          Terminals
          <AgentStateMark state={agent.state} confidence={agent.confidence} />
        </Button>
        <Separator orientation="vertical" className="mx-0.5 h-4" />
        <ToolButton label="Back" disabled>
          <Glyph icon={ArrowLeft01Icon} />
        </ToolButton>
        <ToolButton label="Forward" disabled>
          <Glyph icon={ArrowRight01Icon} />
        </ToolButton>
        <ToolButton label="Reload" keys={["⌘", "R"]}>
          <Glyph icon={RefreshIcon} />
        </ToolButton>
        <Input
          aria-label="Address"
          className="mx-1 flex-1 font-mono"
          value={`localhost:${browser.port.value}${browser.server.path}`}
          onChange={() => undefined}
        />
        <DevServerSelect browser={browser} />
        <Button
          variant="outline"
          aria-pressed={browser.inspect.value === "pick"}
          className={browser.inspect.value === "pick" ? "bg-muted" : undefined}
          onClick={browser.toggleInspect}
        >
          <Glyph icon={CursorPointer01Icon} />
          Inspect
        </Button>
      </div>
      <InspectBar browser={browser} agentId={agent.id} />
      <NativeView browser={browser} />
    </div>
  );
}
