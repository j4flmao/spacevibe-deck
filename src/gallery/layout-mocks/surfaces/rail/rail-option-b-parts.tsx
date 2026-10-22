import { useSignal } from "@preact/signals";
import { Kbd, KbdGroup } from "../../../../ui/controls/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/controls/tooltip";

/**
 * A tooltip with optional chord around one trigger element. `onPress` runs after the tip has
 * closed and played its exit, so a row that unmounts under the pointer leaves no stray tip.
 */
export function Tip({
  label,
  keys,
  onPress,
  children,
}: {
  readonly label: string;
  readonly keys?: readonly string[];
  readonly onPress?: () => void;
  readonly children: preact.JSX.Element;
}) {
  const open = useSignal(false);
  return (
    <Tooltip
      open={open.value}
      onOpenChange={(next: boolean) => {
        open.value = next;
      }}
    >
      <TooltipTrigger
        render={children}
        onClick={() => {
          open.value = false;
          if (onPress) setTimeout(onPress, 260);
        }}
      />
      <TooltipContent>
        {label}
        {keys ? (
          <KbdGroup>
            {keys.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </KbdGroup>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

/** Put the focus back on a row after a menu, rename or search closes. */
export function focusRow(id: string) {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-row="${id}"]`)?.focus();
  });
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // The mock still confirms; a real host owns the clipboard.
  }
}
