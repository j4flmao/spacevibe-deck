import { useSignal } from "@preact/signals";
import { settings, updateSettings } from "../../../settings/settings-store";
import { ToggleRow } from "../../controls/config-row";
import { reportPersistError } from "../../../chrome/events";
import { requestAgentNotificationPermission } from "../../../lib/native-notification";
import { getDesktopEnvironment } from "../../../lib/platform";
import { openNotificationSettings } from "../../../host/shell-host";
import { Button } from "../../controls/button";

/** Deck controls alert delivery; the OS controls authorization and badges. */
export function NotificationsSection() {
  const current = settings.value;
  // Block repeated support checks while this click is in flight.
  const requesting = useSignal(false);
  const openingSettings = useSignal(false);
  const openSettings = async (): Promise<void> => {
    if (openingSettings.value) return;
    openingSettings.value = true;
    try {
      if (!(await openNotificationSettings())) throw new Error("Notification settings unavailable");
    } catch {
      reportPersistError(
        "Couldn't open System Settings. Open Notifications in your system settings.",
      );
    } finally {
      openingSettings.value = false;
    }
  };

  // Disabling is immediate. Enabling checks host support; on Electron the
  // OS owns authorization when the first alert is posted.
  const handleAgentNotificationsToggle = async (): Promise<void> => {
    if (requesting.value) {
      // Local guard: blocks re-entry synchronously, before the `requesting`
      // signal write has propagated to a re-rendered (disabled) button.
      return;
    }
    if (current.agentNotifications) {
      updateSettings({ agentNotifications: false });
      return;
    }
    requesting.value = true;
    try {
      const granted = await requestAgentNotificationPermission();
      if (granted) {
        updateSettings({ agentNotifications: true });
      } else {
        reportPersistError("Notifications are not supported on this system.");
      }
    } catch {
      reportPersistError("Couldn't enable notifications. Try again.");
    } finally {
      requesting.value = false;
    }
  };

  return (
    <>
      <ToggleRow
        settingKey="agentNotifications"
        desc="Native alert when a background agent finishes or needs you"
        note={
          getDesktopEnvironment().platform !== "unsupported" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={openingSettings.value}
              onClick={openSettings}
            >
              Open System Settings
            </Button>
          ) : undefined
        }
        checked={current.agentNotifications}
        disabled={requesting.value}
        onToggle={handleAgentNotificationsToggle}
      />
    </>
  );
}
