/** What the mock shell hands each layout option. */
export interface OptionProps {
  /** The agent the option opens focused on (`?focus=`). */
  readonly initialFocus: string;
  /** The option's one deep-linkable overlay state (`?overlay=`), or null. */
  readonly overlay: string | null;
}
