import type { Icon } from "@phosphor-icons/react";
import type { ComponentChildren, JSX } from "preact";
import { DeckIcon, ROW_ICON } from "../controls/deck-icon";
import { DropdownMenuItem } from "../controls/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../controls/tooltip";

/** An icon button's tooltip: `button` is the trigger element, `children` its glyph. */
export function Tip({
  label,
  button,
  children,
}: {
  readonly label: string;
  readonly button: JSX.Element;
  readonly children: ComponentChildren;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={button}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** A menu item that leads with its icon. */
export function MenuEntry({
  icon,
  onClick,
  disabled,
  variant,
  children,
}: {
  readonly icon: Icon;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly variant?: "destructive";
  readonly children: ComponentChildren;
}) {
  return (
    <DropdownMenuItem onClick={onClick} disabled={disabled} variant={variant}>
      <DeckIcon icon={icon} size={ROW_ICON} />
      {children}
    </DropdownMenuItem>
  );
}
