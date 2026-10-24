import { Button } from "../controls/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../controls/dialog";
import { recoverRailFocus } from "./project-rail-focus";
import { StageCover } from "./project-rail-menu-parts";

export interface ProjectRailRemoveDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly name: string;
  readonly tabCount: number;
  onConfirm(): void;
}

/**
 * Confirms taking a live project off the rail, which closes every tab of it. The shipped header
 * asked nothing of its own (a busy agent still raises the host's close dialog, which this
 * leaves in place); a menu item is easier to hit than that ✕ was.
 */
export function ProjectRailRemoveDialog({
  open,
  onOpenChange,
  name,
  tabCount,
  onConfirm,
}: ProjectRailRemoveDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen: boolean) => {
        if (!isOpen) {
          recoverRailFocus();
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <StageCover />
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>
            Closes {tabCount} {tabCount === 1 ? "tab" : "tabs"} and takes the project off the rail.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
