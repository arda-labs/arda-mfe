// Pure helpers behind WidgetFrame/WidgetSlot, kept out of the component so they
// can be unit-tested without a DOM.
import type { ChartTheme } from "./chart-theme"
import { clampWidgetHeight } from "./widget-protocol"

// A slider drag fires a resize per frame; applying sub-2px moves only churns
// layout. `applied` is the last height actually set on the iframe (already
// clamped), `next` the raw height reported by the widget.
export const WIDGET_HEIGHT_EPSILON = 2

export function shouldApplyHeight(applied: number, next: number): boolean {
  return Math.abs(clampWidgetHeight(next) - applied) >= WIDGET_HEIGHT_EPSILON
}

// The iframe `load` event fires for every document the frame ends up showing,
// and a widget can reload or navigate itself. Business data is handed over only
// on the first load of a generation (the document the parent built); a later
// load in the same generation is whatever the frame navigated to and gets
// nothing. `sent` is the generation data was last posted for.
export function shouldPostData(sent: number | null, generation: number): boolean {
  return sent !== generation
}

// MutationObserver fires on every <html> class change, not only theme flips.
// Rebuilding the document reloads the iframe, so only a changed theme counts.
export function sameChartTheme(a: ChartTheme, b: ChartTheme): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Registry of mounted widgets. Past `max`, the oldest is told to collapse so a
// long thread never holds many live iframes. Every acquire is its own entry,
// so a release only removes that entry and calling it twice (or after the entry
// was evicted) is a no-op. That keeps React StrictMode's mount/unmount/mount
// effect cycle from double-registering or collapsing the wrong frame.
export class WidgetSlotRegistry {
  private entries: Array<{ collapse: () => void }> = []
  private readonly max: number

  constructor(max: number) {
    this.max = max
  }

  get size(): number {
    return this.entries.length
  }

  acquire(collapse: () => void): () => void {
    const entry = { collapse }
    this.entries.push(entry)
    while (this.entries.length > this.max) this.entries.shift()?.collapse()
    return () => {
      const index = this.entries.indexOf(entry)
      if (index >= 0) this.entries.splice(index, 1)
    }
  }
}
