import { cn } from "@/lib/cn";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { DEFAULT_SETTINGS, type Settings } from "../../settings/settings-schema";
import { settingRow } from "../../settings/settings-rows";
import { resetSettingsKeys } from "../../settings/settings-store";
import { Button } from "../controls/button";
import { DeckIcon, ROW_ICON } from "../controls/deck-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../controls/tooltip";
import { SettingControl } from "./command-settings-controls";
import { LIVE_ROW_ATTRIBUTE, rowDomId } from "./command-settings-live";
import { commandActiveKey } from "./command-settings-state";
import { settingValueText } from "./command-settings-view";

interface LiveRowProps {
  readonly itemKey: string;
  readonly settingKey: keyof Settings;
  readonly settings: Settings;
  /** The area's name, shown where no heading names it. */
  readonly crumb: string | null;
  readonly active: boolean;
  /** The settings snapshot is still loading. */
  readonly locked: boolean;
}

/**
 * One setting as a row: a changed mark, the label, the control in place and, once the value
 * differs from its default, a reset. The row is a plain container; its control owns the keyboard.
 */
export function LiveRow({ itemKey, settingKey, settings, crumb, active, locked }: LiveRowProps) {
  const row = settingRow(settingKey, settings);
  const reset = row.changed && row.resetKeys !== null ? row.resetKeys : null;
  const fallback = settingValueText(settingKey, DEFAULT_SETTINGS);
  return (
    <li
      id={rowDomId(itemKey)}
      {...{ [LIVE_ROW_ATTRIBUTE]: "" }}
      data-active={active || undefined}
      aria-current={active || undefined}
      onPointerMove={() => {
        if (commandActiveKey.peek() !== itemKey) commandActiveKey.value = itemKey;
      }}
      className={cn(
        "grid min-h-9 grid-cols-[8px_minmax(0,1fr)_auto_28px] items-center gap-x-2.5 rounded-md px-2.5 py-1 text-xs text-foreground",
        active && "bg-muted",
      )}
    >
      <span className="flex justify-center">
        {row.changed ? (
          <>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
            <span className="sr-only">Changed</span>
          </>
        ) : null}
      </span>
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate">{row.label}</span>
        {crumb ? <span className="shrink-0 text-muted-foreground">{crumb}</span> : null}
      </span>
      <span className="flex items-center justify-end gap-2">
        <SettingControl row={row} disabled={locked} />
      </span>
      <span className="flex justify-end">
        {reset === null ? null : (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={locked}
                  aria-label={`Reset ${row.label} to ${fallback}`}
                  onClick={() => resetSettingsKeys(reset)}
                />
              }
            >
              <DeckIcon icon={ArrowCounterClockwise} size={ROW_ICON} />
            </TooltipTrigger>
            <TooltipContent>Reset to {fallback}</TooltipContent>
          </Tooltip>
        )}
      </span>
    </li>
  );
}
