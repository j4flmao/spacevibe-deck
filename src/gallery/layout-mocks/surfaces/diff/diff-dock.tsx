import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "../../../../ui/controls/button";
import { AgentLogo } from "../../agent-parts";
import { AGENT_NAME, placeOf, type MockAgent } from "../../layout-fixture";
import { DiffCode } from "./diff-code";
import { DiffComposer, SendNotice } from "./diff-composer";
import { useReview } from "./diff-data";
import { CommentButton, FileButton, SplitToggle } from "./diff-parts";

/** Option a: the dock column, widened, holds the file list and the diff; terminals stay beside it. */
export function DiffDock({ agent }: { readonly agent: MockAgent }) {
  const review = useReview(agent);
  const { checkout } = placeOf(agent);
  const { file } = review;
  const zone =
    review.composing.value && review.range.value
      ? { after: review.range.value.to, node: <DiffComposer review={review} variant="inline" /> }
      : undefined;
  return (
    <aside
      aria-label={`${AGENT_NAME[agent.kind]} diff`}
      className="flex w-[560px] shrink-0 flex-col border-l bg-background"
    >
      <header className="flex h-10 shrink-0 items-center gap-2.5 border-b px-3">
        <AgentLogo kind={agent.kind} className="size-5" />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-xs font-medium text-foreground">Diff</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {checkout.branch ?? "no branch"}
          </span>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close diff">
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
        </Button>
      </header>
      <nav aria-label="Changed files" className="shrink-0 border-b py-1">
        {review.files.map((item, index) => (
          <FileButton
            key={item.change.path}
            file={item}
            active={index === review.fileIndex.value}
            onOpen={() => review.openFile(index)}
          />
        ))}
      </nav>
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-3">
        <SplitToggle review={review} />
        <span className="min-w-0 flex-1" />
        <CommentButton review={review} />
      </div>
      {file ? (
        <DiffCode
          file={file}
          mode={review.split.value ? "split" : "unified"}
          range={review.range.value}
          sent={review.sent.value}
          onSelect={review.select}
          onDrag={review.drag}
          zone={zone}
          className="min-h-0 flex-1"
        />
      ) : null}
      <SendNotice review={review} className="shrink-0 border-t px-3 py-1.5" />
    </aside>
  );
}
