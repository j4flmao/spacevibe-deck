import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../../../../ui/controls/dropdown-menu";
import type { RailAgent } from "./rail-option-b-model";
import { copyText, focusRow } from "./rail-option-b-parts";
import type { RailState } from "./rail-option-b-state";

const LOCKED = new Set(["working", "needs-you", "failed"]);

/** The one row menu, opened by right-click or the hover "more" button. */
export function RowMenuContent({ s, agent }: { readonly s: RailState; readonly agent: RailAgent }) {
  const unread = agent.state === "unchecked";
  return (
    <DropdownMenuContent align="end" className="min-w-48">
      <DropdownMenuItem
        onClick={() => {
          s.editing.value = agent.id;
        }}
      >
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          s.patch(agent.id, { pinned: !agent.pinned });
        }}
      >
        {agent.pinned ? "Unpin" : "Pin"}
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={!unread && LOCKED.has(agent.state)}
        onClick={() => {
          s.patch(agent.id, { state: unread ? "done" : "unchecked" });
        }}
      >
        {unread ? "Mark read" : "Mark unread"}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          void copyText(agent.path);
          s.note(agent.id, "Copied");
        }}
      >
        Copy path
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={agent.branch === null}
        onClick={() => {
          void copyText(agent.branch ?? "");
          s.note(agent.id, "Copied");
        }}
      >
        Copy branch
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          s.note(agent.id, "Opened");
        }}
      >
        Open in Finder
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          s.patch(agent.id, { archived: !agent.archived });
          focusRow(agent.id);
        }}
      >
        {agent.archived ? "Unarchive" : "Archive"}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
