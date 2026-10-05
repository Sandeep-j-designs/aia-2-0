import React, { useEffect, useRef, useState } from "react";
import { Check, Loader2, XCircle } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * The shape a batch takes while it is running.
 *
 * One drawing, two callers — the Tally sync modal and the upload dialog. Both
 * are the same event: a pile of documents going across one at a time, with a
 * count that has to stay trustworthy while it moves. Drawing them differently
 * made the same progress read as two unrelated mechanisms.
 *
 * Built from Figma 21448:26058.
 */

export type RunRowState = "queued" | "active" | "done" | "failed";

export type RunRow = {
  id: string;
  label: string;
  state: RunRowState;
};

/**
 * A number that travels to its target instead of jumping to it.
 *
 * The count is stepped by whatever is doing the work — one document at a time,
 * a few per second — and rendered raw that reads as a stutter, because each
 * step lands with nothing between it and the last. Easing toward the target
 * turns the same steps into one continuous movement. It can sit a fraction
 * behind the truth mid-run; it is exact the moment the run stops, which is the
 * only moment the exact figure is read.
 */
const useSettling = (target: number) => {
  const [shown, setShown] = useState(target);
  const frame = useRef(0);
  const from = useRef(target);
  const startedAt = useRef(0);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(target);
      return;
    }
    from.current = shown;
    startedAt.current = performance.now();
    const DURATION = 260;

    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt.current) / DURATION);
      // easeOutCubic: fast off the mark, settling rather than braking.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from.current + (target - from.current) * eased);
      if (t < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
    // `shown` is read as a starting point, not tracked — depending on it would
    // restart the tween on every frame it sets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return shown;
};

/**
 * Keeps a scroller pinned to its own bottom while rows keep arriving.
 *
 * `scrollTo({ behavior: "smooth" })` is the obvious way to do this and it is
 * why the list stuttered. Native smooth scrolling is a fresh animation per
 * call: at one row every 120ms it was cancelled and restarted three times
 * before it could finish, each restart beginning from zero velocity. The list
 * lurched once per document instead of travelling once.
 *
 * One loop instead, holding its own position and retargeting every frame. New
 * rows move the target; they do not restart anything, so the motion carries
 * its speed across arrivals and reads as a single drift. The smoothing is
 * exponential and scaled by real elapsed time, so it behaves the same on a
 * 120Hz display as on a 60Hz one, and it self-terminates when it lands.
 *
 * TAU is the time to close ~63% of the remaining distance; the eye reads the
 * ~3x of that as the settle. 90ms sits just under the cadence of the run.
 */
const TAU = 90;
const useStickToBottom = (
  ref: React.RefObject<HTMLElement>,
  trigger: number
) => {
  /*
    Whether the list is still following.

    A reader who scrolls up to check a filename has taken control, and being
    yanked back to the bottom on the next arrival is the rudest thing a live
    list can do. So: any scroll that was not this loop's own hands the list
    over, and getting back to the bottom hands it back.

    Told apart by what was last written rather than by listening for wheel and
    touch and keys and scrollbar drags separately — the loop knows exactly
    where it put the scroll, so anything else is someone else.
  */
  const following = useRef(true);
  const written = useRef(-1);
  const frame = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      if (Math.abs(el.scrollTop - written.current) < 1.5) return;
      // 24px of slack: the list runs a little behind the bottom while it is
      // catching up, and that lag must not read as the reader scrolling away.
      following.current = el.scrollHeight - el.clientHeight - el.scrollTop < 24;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !following.current) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.scrollTop = el.scrollHeight - el.clientHeight;
      return;
    }

    let last = 0;
    const step = (now: number) => {
      // Checked every frame, not just at the start: a reader who scrolls up
      // mid-flight would otherwise be dragged the rest of the way by a loop
      // that had already made up its mind.
      if (!following.current) return;
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      // Recomputed per frame: this is what lets a row arriving mid-flight
      // extend the journey instead of interrupting it.
      const target = el.scrollHeight - el.clientHeight;
      const distance = target - el.scrollTop;
      /*
        Land, rather than approach forever.

        scrollTop is stored in whole pixels, so an exponential step is rounded
        away once the remaining distance is small: at 2px to go the step is
        0.33px, which rounds to no movement at all. The list sat a pixel or
        two short of the bottom with the loop still running every frame,
        burning a wake-up per frame to move nothing.

        Inside a pixel of the target, take it. Outside, never step less than a
        whole pixel, so progress always survives the rounding.
      */
      if (Math.abs(distance) < 1) {
        el.scrollTop = target;
        written.current = el.scrollTop;
        return;
      }
      const stride = distance * (1 - Math.exp(-dt / TAU));
      el.scrollTop += Math.abs(stride) < 1 ? Math.sign(distance) : stride;
      written.current = el.scrollTop;
      frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [ref, trigger]);
};

/** "29 / 47 Bills", and the bar under it. */
export const RunCount = ({
  settled,
  total,
  unit,
}: {
  settled: number;
  total: number;
  unit: string;
}) => {
  const shown = useSettling(settled);
  const percent = total === 0 ? 0 : (shown / total) * 100;
  // Precision Indigo's segmented track (the reference .extraction-stages):
  // short 2px bars with a gap, never more than twenty however long the run.
  const segments = Math.max(1, Math.min(total, 20));
  const complete = total > 0 && percent >= 100;

  return (
    <div className="space-y-2">
      <p className="flex items-baseline gap-2">
        <span className="fig text-[28px] font-medium leading-none text-pi-ink">
          {Math.round(shown)}
        </span>
        <span className="text-[13px] text-pi-body">
          / {total} {unit}
        </span>
      </p>
      {/*
        The bar rides the same eased number as the count, so the two cannot
        disagree — and its own transition is off, because a transition on top
        of a tween is two easings fighting over one value.
      */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="flex gap-2"
      >
        {Array.from({ length: segments }, (_, i) => {
          const fill = Math.max(
            0,
            Math.min(1, (percent / 100) * segments - i)
          );
          return (
            <span
              key={i}
              className="relative h-0.5 flex-1 overflow-hidden rounded-[2px] bg-pi-fill-2"
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0",
                  complete ? "bg-pi-success-dot" : "bg-pi-brand"
                )}
                style={{ width: `${fill * 100}%` }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const RunRowItem = ({ row }: { row: RunRow }) => (
  <div
    className={cn(
      // A fixed height, so a row changing state cannot resize the list under
      // the rows below it.
      "flex h-[42px] items-center gap-3 border-b border-pi-line px-3 last:border-b-0",
      /*
        Fades in where it lands, without sliding.

        It used to slide up as it appeared, which put two movements on one
        row: its own, and the list scrolling underneath it. The two ran on
        different clocks and the row appeared to wobble into place. The scroll
        is the movement now; the fade is only there so the row does not snap
        into existence at full strength.

        200ms is under the cadence of the run, so a row has finished entering
        before the next one starts.
      */
      "animate-in fade-in-0 duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none",
      "transition-colors duration-200 motion-reduce:transition-none",
      // The left border is always there and usually transparent: adding one to
      // the active row would shift its text 2px sideways as it lights up.
      "border-l-2 border-l-transparent",
      row.state === "active" && "border-l-pi-brand bg-pi-brand-tint"
    )}
  >
    <span className="relative flex h-[18px] w-[18px] flex-none items-center justify-center">
      {/* zoom-in-95, not 50: a tick that grows from half size pops, and
          thirty-four pops in a row is the list twitching. It should read as
          the state settling, which is a fade with the faintest swell. */}
      {row.state === "done" ? (
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-pi-success-bg animate-in fade-in-0 zoom-in-95 duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none">
          <Check className="h-3 w-3 text-pi-success" strokeWidth={2.5} />
        </span>
      ) : row.state === "failed" ? (
        <XCircle className="h-[18px] w-[18px] text-pi-danger animate-in fade-in-0 zoom-in-95 duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none" />
      ) : (
        <Loader2 className="h-4 w-4 animate-spin text-pi-brand motion-reduce:animate-none" />
      )}
    </span>
    <span className="code truncate text-[13px] text-pi-ink">{row.label}</span>
  </div>
);

/**
 * Only what has happened, plus what is happening. The queue behind it is a
 * number, not a list — showing it would bury the live row.
 *
 * `settled` is passed rather than derived so the scroll fires on the count
 * changing, not on every re-render of the same rows.
 */
export const RunRowList = ({
  rows,
  settled,
  className,
}: {
  rows: RunRow[];
  settled: number;
  className?: string;
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  // The row that matters is the one in flight, and it is always last.
  useStickToBottom(listRef, settled);

  return (
    <div
      ref={listRef}
      className={cn(
        "max-h-[180px] overflow-y-auto rounded-lg border border-pi-line bg-pi-surface-panel",
        // `className` last, so a caller can pin the height instead of letting
        // the box grow into it.
        className
      )}
    >
      {rows
        .filter((row) => row.state !== "queued")
        .map((row) => (
          <RunRowItem key={row.id} row={row} />
        ))}
    </div>
  );
};
