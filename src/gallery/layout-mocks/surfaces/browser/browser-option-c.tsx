import {
  CursorPointer01Icon,
  LaptopIcon,
  RefreshIcon,
  SmartPhone01Icon,
  Tablet01Icon,
} from "@hugeicons/core-free-icons";
import { useSignal } from "@preact/signals";
import { Input } from "../../../../ui/controls/input";
import { ToggleGroup, ToggleGroupItem } from "../../../../ui/controls/toggle-group";
import type { MockAgent } from "../../layout-fixture";
import { DevServerSelect, Glyph, InspectBar, NativeView, ToolButton } from "./browser-chrome";
import { useBrowser } from "./browser-state";

const DEVICES = [
  { id: "phone", label: "Phone, 390 px", width: 390, icon: SmartPhone01Icon },
  { id: "tablet", label: "Tablet, 768 px", width: 768, icon: Tablet01Icon },
  { id: "fit", label: "Fit to column", width: null, icon: LaptopIcon },
] as const;

/** Option c: the page lives in the right column; the terminals keep the whole stage. */
export function BrowserDock({ agent }: { readonly agent: MockAgent }) {
  const browser = useBrowser("off");
  const device = useSignal<(typeof DEVICES)[number]["id"]>("phone");
  const current = DEVICES.find((item) => item.id === device.value) ?? DEVICES[0];

  return (
    <aside aria-label="Browser" className="flex w-[460px] shrink-0 flex-col border-l bg-background">
      <div className="flex h-10 shrink-0 items-center gap-1 px-2">
        <DevServerSelect browser={browser} />
        <Input
          aria-label="Address"
          className="flex-1 font-mono"
          value={`localhost:${browser.port.value}${browser.server.path}`}
          onChange={() => undefined}
        />
        <ToolButton label="Reload" keys={["⌘", "R"]}>
          <Glyph icon={RefreshIcon} />
        </ToolButton>
      </div>
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-2">
        <ToggleGroup
          aria-label="Device width"
          value={[device.value]}
          onValueChange={(next: unknown[]) => {
            const id = next[0];
            if (DEVICES.some((item) => item.id === id)) device.value = id as typeof device.value;
          }}
          size="sm"
        >
          {DEVICES.map((item) => (
            <ToggleGroupItem key={item.id} value={item.id} aria-label={item.label}>
              <Glyph icon={item.icon} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToolButton
          label="Inspect"
          pressed={browser.inspect.value === "pick"}
          onClick={browser.toggleInspect}
        >
          <Glyph icon={CursorPointer01Icon} />
        </ToolButton>
      </div>
      <InspectBar browser={browser} agentId={agent.id} />
      <NativeView browser={browser} emulate={current.width} />
    </aside>
  );
}
