import { Button } from "../../../../ui/controls/button";
import { Kbd } from "../../../../ui/controls/kbd";
import { DiffCode } from "./diff-code";
import { DiffComposer, SendNotice } from "./diff-composer";
import { useReview } from "./diff-data";
import { CommentButton, Counts, FileButton, SplitToggle } from "./diff-parts";
import { DiffStageShell } from "./diff-stage-shell";
import type { MockAgent } from "../../layout-fixture";

/** Option b: the diff takes the stage side by side, with a slim file rail; Esc returns to terminals. */
export function DiffStage({ agent }: { readonly agent: MockAgent }) {
  const review = useReview(agent, { split: true });
  const { file } = review;
  return (
    <DiffStageShell agent={agent} review={review} label="Back to diff">
      <header className="flex h-9 shrink-0 items-center gap-3 border-b px-3 text-xs">
        <span className="min-w-0 truncate font-mono text-foreground">{file.change.path}</span>
        <Counts change={file.change} />
        <span className="min-w-0 flex-1" />
        <SplitToggle review={review} />
        <CommentButton review={review} />
        <Button
          size="sm"
          variant="ghost"
          aria-label="Back to terminals"
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))}
        >
          Terminals
          <Kbd>Esc</Kbd>
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Changed files" className="w-56 shrink-0 overflow-y-auto border-r py-1">
          {review.files.map((item, index) => (
            <FileButton
              key={item.change.path}
              file={item}
              rail
              active={index === review.fileIndex.value}
              onOpen={() => review.openFile(index)}
            />
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
          <DiffCode
            file={file}
            mode={review.split.value ? "split" : "unified"}
            range={review.range.value}
            sent={review.sent.value}
            onSelect={review.select}
            onDrag={review.drag}
            className="min-h-0 flex-1"
          />
          {review.composing.value ? (
            <DiffComposer review={review} variant="bar" />
          ) : (
            <SendNotice review={review} className="shrink-0 border-t px-3 py-2" />
          )}
        </div>
      </div>
    </DiffStageShell>
  );
}
