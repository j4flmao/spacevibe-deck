import { cn } from "@/lib/cn";
import { AgentGlyph } from "../../ui/controls/agent-glyph";
import type { AgentKind, Confidence, MockState } from "./layout-fixture";

/**
 * The one state mark every mock uses, so the options differ in layout only.
 * A fixed 10px box: geometry never moves between states. Only `working` (a
 * turning ring) and `needs-you` (one ripple) move, and only while they hold.
 * An inferred `needs-you`, `unchecked` or `done` is drawn hollow.
 */
export function AgentStateMark({
  state,
  confidence = "explicit",
  className,
}: {
  readonly state: MockState;
  readonly confidence?: Confidence;
  readonly className?: string;
}) {
  const hollow = confidence === "inferred" && state !== "failed" && state !== "working";
  return (
    <span
      aria-hidden="true"
      data-state={state}
      className={cn(
        "relative inline-flex size-2.5 shrink-0 items-center justify-center",
        className,
      )}
    >
      {state === "working" ? (
        <span className="size-2.5 animate-spin rounded-full border-[1.5px] border-foreground/25 border-t-foreground motion-reduce:animate-none" />
      ) : state === "ended" ? (
        <span className="size-[7px] rounded-[1.5px] bg-muted-foreground" />
      ) : state === "idle" ? null : (
        <>
          {state === "needs-you" ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-amber-500/60 motion-reduce:hidden dark:bg-amber-400/50" />
          ) : null}
          <span
            className={cn(
              "relative size-2 rounded-full",
              state === "failed" && "bg-red-600 dark:bg-red-500",
              state === "needs-you" &&
                (hollow
                  ? "border-[1.5px] border-amber-500 dark:border-amber-400"
                  : "bg-amber-500 dark:bg-amber-400"),
              state === "unchecked" &&
                (hollow
                  ? "border-[1.5px] border-sky-600 dark:border-sky-400"
                  : "bg-sky-600 dark:bg-sky-400"),
              state === "done" &&
                (hollow ? "border-[1.5px] border-muted-foreground" : "bg-muted-foreground"),
            )}
          />
        </>
      )}
    </span>
  );
}

/** The agent's brand mark in Deck's own logo set; size it with `className`. */
export function AgentLogo({
  kind,
  className,
}: {
  readonly kind: AgentKind;
  readonly className?: string;
}) {
  return <AgentGlyph agent={kind} className={cn("size-4 shrink-0", className)} />;
}

/** macOS window controls, drawn inset the way Deck's hidden title bar places them. */
export function TrafficLights({ className }: { readonly className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex items-center gap-2", className)}>
      <span className="size-3 rounded-full bg-[#ff5f57]" />
      <span className="size-3 rounded-full bg-[#febc2e]" />
      <span className="size-3 rounded-full bg-[#28c840]" />
    </div>
  );
}
