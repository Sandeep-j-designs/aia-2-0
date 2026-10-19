/**
 * AI Accountant "Ledger" icon set.
 *
 * - Drawn on a 24px grid with a 3px live-area margin and a 1.75 stroke.
 * - Joins and caps are round. Shapes are built from geometric primitives only:
 *   straight lines, circles, arcs and 2px-radius rectangles.
 * - Documents carry ruled lines because the product works on ledgers.
 * - The signature is the tick family:
 *     - `TickAi`: a tick drawn from a plotted node, meaning the machine checked it.
 *     - `TickYou`: a heavier hand tick, meaning a person checked it.
 *     - `NeedsYou`: a dashed ring waiting for a mark.
 * - The AI mark is `Sparkle` (Lucide's single sparkle), with `Sparkles` and
 *   `AiMark` resolving to it (7 Oct 2026, user's choice over `TickAi`). It is
 *   drawn by `components/inbox/v2/ai-mark.tsx` wherever a value is still the
 *   AI's decision; `TickAi` stays for "the machine checked it" moments.
 *
 * Exports keep the lucide-react and Radix icon names the codebase already uses,
 * so a feature file swaps its import line and nothing else.
 */
import * as React from "react";

import { cn } from "@/lib/utils";

export type IconProps = Omit<React.SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  color?: string;
};
export type IconComponent = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;
/** Alias kept so `import type { LucideIcon }` call sites keep compiling. */
export type LucideIcon = IconComponent;
export type LucideProps = IconProps;

const kebab = (s: string) =>
  s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

function make(name: string, glyph: React.ReactNode): IconComponent {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(
    (
      {
        size = 24,
        strokeWidth = 1.75,
        color = "currentColor",
        absoluteStrokeWidth: _absolute,
        className,
        ...rest
      },
      ref
    ) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={rest["aria-label"] ? undefined : true}
        focusable="false"
        className={cn("aia-icon", `aia-icon-${kebab(name)}`, className)}
        {...rest}
      >
        {glyph}
      </svg>
    )
  );
  Icon.displayName = name;
  return Icon;
}

/* Shared parts ------------------------------------------------------------ */
const Dot = ({ x, y, r = 1.15 }: { x: number; y: number; r?: number }) => (
  <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none" />
);
/** Document sheet with a folded corner. */
const PAGE =
  "M6.5 3h7.5l4.5 4.5V20a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z";
const FOLD = "M14 3v4.5h4.5";
const CLOUD =
  "M7 19a5 5 0 0 1-.9-9.92A6.5 6.5 0 0 1 18.6 10.5 4.25 4.25 0 0 1 17.75 19Z";
const CLOUD_OPEN =
  "M7.5 18.5H7a5 5 0 0 1-.9-9.92A6.5 6.5 0 0 1 18.6 10 4.25 4.25 0 0 1 17.5 18.5h-.5";
const SPINNER = "M21 12a9 9 0 1 1-6.22-8.56";
const FOLDER =
  "M3.5 7a1 1 0 0 1 1-1h4.75l2 2h8.25a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z";

/* Signature tick family --------------------------------------------------- */
export const TickAi = make(
  "TickAi",
  <>
    <circle cx="4.4" cy="12.9" r="2.15" fill="currentColor" stroke="none" />
    <path d="M7.9 15.5 9.9 17.5 19.75 6.75" strokeWidth={1.9} />
  </>
);
export const TickYou = make(
  "TickYou",
  <path d="M4.25 12.5 9.4 17.5 19.75 6.5" strokeWidth={2.4} />
);
export const NeedsYou = make(
  "NeedsYou",
  <circle
    cx="12"
    cy="12"
    r="7.25"
    strokeDasharray="3.4 2.3"
    strokeWidth={1.9}
  />
);
/**
 * Lucide "sparkles", paths verbatim, drawn duotone (7 Oct 2026, user: the
 * single outline sparkle "looks very simple"): the main star carries a soft
 * fill of its own colour under the stroke, and the two plus accents stay
 * strokes. Same geometry in the engines' `#i-ai` symbol.
 */
export const SPARKLE_PATH =
  "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z";
export const SPARKLE_ACCENTS = "M20 3v4M22 5h-4M4 17v2M5 18H3";
export const Sparkle = make(
  "Sparkle",
  <>
    <path d={SPARKLE_PATH} fill="currentColor" fillOpacity={0.22} />
    <path d={SPARKLE_ACCENTS} />
  </>
);
export const Sparkles = Sparkle;
/**
 * Neo's mark (19 Oct 2026): the sparkle's star, solid, without its accents.
 * Neo only — the duotone Sparkle stays the mark for a value the AI decided.
 */
export const NeoStar = make(
  "NeoStar",
  <path d={SPARKLE_PATH} fill="currentColor" stroke="none" />
);
export const AiMark = Sparkle;

/* Navigation -------------------------------------------------------------- */
export const ChevronDown = make("ChevronDown", <path d="m6 9 6 6 6-6" />);
export const ChevronUp = make("ChevronUp", <path d="m6 15 6-6 6 6" />);
export const ChevronLeft = make("ChevronLeft", <path d="m15 6-6 6 6 6" />);
export const ChevronRight = make("ChevronRight", <path d="m9 6 6 6-6 6" />);
export const ChevronsLeft = make(
  "ChevronsLeft",
  <path d="m11.5 6-6 6 6 6M18.5 6l-6 6 6 6" />
);
export const ChevronsRight = make(
  "ChevronsRight",
  <path d="m5.5 6 6 6-6 6M12.5 6l6 6-6 6" />
);
export const ArrowRight = make(
  "ArrowRight",
  <path d="M4 12h16M14 6l6 6-6 6" />
);
export const ArrowLeft = make("ArrowLeft", <path d="M20 12H4M10 6l-6 6 6 6" />);
export const ArrowUp = make("ArrowUp", <path d="M12 20V4M6 10l6-6 6 6" />);
export const ArrowDown = make("ArrowDown", <path d="M12 4v16M6 14l6 6 6-6" />);
export const ArrowUpDown = make(
  "ArrowUpDown",
  <path d="M8 19V5M4.5 8.5 8 5l3.5 3.5M16 5v14M12.5 15.5 16 19l3.5-3.5" />
);
export const ArrowLeftRight = make(
  "ArrowLeftRight",
  <path d="M4 8h16M16.5 4.5 20 8l-3.5 3.5M20 16H4M7.5 12.5 4 16l3.5 3.5" />
);
export const ExternalLink = make(
  "ExternalLink",
  <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
);
export const CaretDown = make(
  "CaretDown",
  <path d="M7 10h10l-5 5.5Z" fill="currentColor" />
);

/* Primitives -------------------------------------------------------------- */
export const X = make("X", <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />);
export const Check = make("Check", <path d="M4.75 12.75 9.4 17.3 19.5 6.6" />);
export const CheckCheck = make(
  "CheckCheck",
  <path d="M2.75 12.75 7 17 15.25 8M12.25 15.75 13.5 17 21.5 8" />
);
export const Plus = make("Plus", <path d="M12 5v14M5 12h14" />);
export const Minus = make("Minus", <path d="M5 12h14" />);
export const Slash = make("Slash", <path d="M15 4 9 20" />);
export const Circle = make("Circle", <circle cx="12" cy="12" r="8" />);
export const DotFilled = make("DotFilled", <Dot x={12} y={12} r={3} />);
export const Ellipsis = make(
  "Ellipsis",
  <>
    <Dot x={6} y={12} />
    <Dot x={12} y={12} />
    <Dot x={18} y={12} />
  </>
);
export const EllipsisVertical = make(
  "EllipsisVertical",
  <>
    <Dot x={12} y={6} />
    <Dot x={12} y={12} />
    <Dot x={12} y={18} />
  </>
);
export const GripVertical = make(
  "GripVertical",
  <>
    <Dot x={9} y={6.5} r={1.05} />
    <Dot x={15} y={6.5} r={1.05} />
    <Dot x={9} y={12} r={1.05} />
    <Dot x={15} y={12} r={1.05} />
    <Dot x={9} y={17.5} r={1.05} />
    <Dot x={15} y={17.5} r={1.05} />
  </>
);
export const Search = make(
  "Search",
  <>
    <circle cx="10.75" cy="10.75" r="6.25" />
    <path d="m15.4 15.4 4.6 4.6" />
  </>
);
/** Ledger rules that narrow, not a funnel. */
export const ListFilter = make(
  "ListFilter",
  <path d="M4 7h16M7 12h10M10 17h4" />
);
export const Columns3 = make(
  "Columns3",
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M9.25 4.5v15M14.75 4.5v15" />
  </>
);

/* Status ------------------------------------------------------------------ */
export const Info = make(
  "Info",
  <>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M12 11v5" />
    <Dot x={12} y={7.9} r={1.05} />
  </>
);
export const CircleAlert = make(
  "CircleAlert",
  <>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M12 7.75v4.75" />
    <Dot x={12} y={16} r={1.05} />
  </>
);
export const TriangleAlert = make(
  "TriangleAlert",
  <>
    <path d="M10.6 4.6a1.6 1.6 0 0 1 2.8 0l7.4 13a1.6 1.6 0 0 1-1.4 2.4H4.6a1.6 1.6 0 0 1-1.4-2.4Z" />
    <path d="M12 9.5v4" />
    <Dot x={12} y={16.6} r={1.05} />
  </>
);
export const CircleCheck = make(
  "CircleCheck",
  <>
    <circle cx="12" cy="12" r="8.75" />
    <path d="m8 12.3 2.75 2.7 5.25-5.6" />
  </>
);
export const XCircle = make(
  "XCircle",
  <>
    <circle cx="12" cy="12" r="8.75" />
    <path d="m9.25 9.25 5.5 5.5M14.75 9.25l-5.5 5.5" />
  </>
);
export const Ban = make(
  "Ban",
  <>
    <circle cx="12" cy="12" r="8.75" />
    <path d="m5.8 5.8 12.4 12.4" />
  </>
);
export const CirclePause = make(
  "CirclePause",
  <>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M10 9.25v5.5M14 9.25v5.5" />
  </>
);
export const Loader2 = make("Loader2", <path d={SPINNER} />);
export const Clock = make(
  "Clock",
  <>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M12 7.5V12l3 2" />
  </>
);
export const Lock = make(
  "Lock",
  <>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8.25 10.5V8a3.75 3.75 0 0 1 7.5 0v2.5" />
  </>
);
export const ShieldCheck = make(
  "ShieldCheck",
  <>
    <path d="M12 3.25 19 6v5.5c0 4.25-2.9 7.75-7 9.25-4.1-1.5-7-5-7-9.25V6Z" />
    <path d="m9 12 2.1 2.1L15.25 10" />
  </>
);

/* Documents --------------------------------------------------------------- */
export const FileText = make(
  "FileText",
  <>
    <path d={PAGE} />
    <path d={FOLD} />
    <path d="M8.5 12.5h7M8.5 16h5" />
  </>
);
export const FileSpreadsheet = make(
  "FileSpreadsheet",
  <>
    <path d={PAGE} />
    <path d={FOLD} />
    <path d="M8.5 11.5h7v6h-7ZM12 11.5v6M8.5 14.5h7" />
  </>
);
export const FileImage = make(
  "FileImage",
  <>
    <path d={PAGE} />
    <path d={FOLD} />
    <circle cx="10" cy="12" r="1.25" />
    <path d="m8 18 2.75-2.75 1.75 1.75 1.75-1.75L16 17" />
  </>
);
export const FileJson = make(
  "FileJson",
  <>
    <path d={PAGE} />
    <path d={FOLD} />
    <path d="M10 11.5c-1 0-1 .75-1 1.5s-.25 1.5-1 1.5c.75 0 1 .75 1 1.5s0 1.5 1 1.5M14 11.5c1 0 1 .75 1 1.5s.25 1.5 1 1.5c-.75 0-1 .75-1 1.5s0 1.5-1 1.5" />
  </>
);
export const FileWarning = make(
  "FileWarning",
  <>
    <path d={PAGE} />
    <path d={FOLD} />
    <path d="M12 11v3.5" />
    <Dot x={12} y={17.25} r={1.05} />
  </>
);
export const FilePlus2 = make(
  "FilePlus2",
  <>
    <path d={PAGE} />
    <path d={FOLD} />
    <path d="M12 11v6M9 14h6" />
  </>
);
export const FileStack = make(
  "FileStack",
  <>
    <path d="M9 6.5V4a1 1 0 0 1 1-1h6.5L20 6.5V16a1 1 0 0 1-1 1h-2" />
    <path d="M5 7h7.5L16 10.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
    <path d="M7 14h6M7 17.25h4" />
  </>
);
export const Receipt = make(
  "Receipt",
  <>
    <path d="M6 3.5h12V21l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21Z" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
  </>
);
export const Paperclip = make(
  "Paperclip",
  <path d="m19.5 11.5-7.6 7.6a5 5 0 0 1-7.1-7.1l8.3-8.3a3.3 3.3 0 0 1 4.7 4.7l-8.3 8.3a1.65 1.65 0 0 1-2.35-2.35L14.9 6.6" />
);
export const Copy = make(
  "Copy",
  <>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
    <path d="M15.5 8.5V5a1 1 0 0 0-1-1h-9.5a1 1 0 0 0-1 1v9.5a1 1 0 0 0 1 1h3.5" />
  </>
);
export const Download = make(
  "Download",
  <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />
);
export const Upload = make(
  "Upload",
  <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M5 20h14" />
);
export const Inbox = make(
  "Inbox",
  <path d="M3.5 13 6 5.5h12l2.5 7.5V18a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1ZM3.5 13h5l1.5 2.5h4l1.5-2.5h5" />
);
export const Mail = make(
  "Mail",
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.75 6.75 8.25 6.25 8.25-6.25" />
  </>
);
export const MessageCircle = make(
  "MessageCircle",
  <path d="M20.25 11.5a8.25 8.25 0 0 1-12.1 7.3L3.75 20.25l1.4-4.2A8.25 8.25 0 1 1 20.25 11.5Z" />
);
export const MessageSquareText = make(
  "MessageSquareText",
  <path d="M4.5 5h15a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H9.5l-5 3.5V6a1 1 0 0 1 1-1ZM8 9h8M8 12.5h5" />
);
export const Link = make(
  "Link",
  <path d="M10 14a4 4 0 0 0 5.66 0l3-3A4 4 0 0 0 13 5.34l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 18.66l1-1" />
);
export const Unlink = make(
  "Unlink",
  <path d="m15 12 3.25-3.25a3.5 3.5 0 0 0-5-5L10 7M9 12l-3.25 3.25a3.5 3.5 0 0 0 5 5L14 17M4 4l2.5 2.5M17.5 17.5 20 20" />
);
export const Scissors = make(
  "Scissors",
  <>
    <circle cx="6" cy="6.5" r="2.5" />
    <circle cx="6" cy="17.5" r="2.5" />
    <path d="M8.2 7.8 20 17.5M8.2 16.2 20 6.5" />
  </>
);
export const Split = make(
  "Split",
  <path d="M16 3.5h4.5V8M8 3.5H3.5V8M20.5 3.5 13 11v9.5M3.5 3.5 11 11" />
);

/* Actions ----------------------------------------------------------------- */
export const Trash2 = make(
  "Trash2",
  <path d="M4 7h16M9 7V4.5h6V7M6 7l1 12.5a1 1 0 0 0 1 .9h8a1 1 0 0 0 1-.9L18 7M10 11v5.5M14 11v5.5" />
);
export const Pencil = make(
  "Pencil",
  <path d="M15.5 4.5 19.5 8.5 9 19H5v-4ZM13.5 6.5l4 4" />
);
export const PencilLine = make(
  "PencilLine",
  <path d="M13.5 4.5 17.5 8.5 8 18H4v-4ZM11.5 6.5l4 4M13 20h7" />
);
export const Save = make(
  "Save",
  <path d="M5 4h11l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8 4v4.5h7V4M8 20v-6h8v6" />
);
export const Undo2 = make(
  "Undo2",
  <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
);
export const RotateCcw = make(
  "RotateCcw",
  <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 3.5v5h5" />
);
export const RefreshCw = make(
  "RefreshCw",
  <path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.3L20 15.5M20 20v-4.5h-4.5" />
);
export const Cloud = make("Cloud", <path d={CLOUD} />);
export const CloudOff = make(
  "CloudOff",
  <>
    <path d={CLOUD} />
    <path d="M3.5 3.5 20.5 20.5" />
  </>
);
export const CloudAlert = make(
  "CloudAlert",
  <>
    <path d={CLOUD} />
    <path d="M12 10.5v3" />
    <Dot x={12} y={16} r={1} />
  </>
);
export const CloudUpload = make(
  "CloudUpload",
  <>
    <path d={CLOUD_OPEN} />
    <path d="M12 20.5V12M9 15l3-3 3 3" />
  </>
);
export const CloudDownload = make(
  "CloudDownload",
  <>
    <path d={CLOUD_OPEN} />
    <path d="M12 11.5V20M9 17l3 3 3-3" />
  </>
);
export const FolderSync = make(
  "FolderSync",
  <>
    <path d={FOLDER} />
    <path d="M10 11.5v5M8.5 15 10 16.5l1.5-1.5M14 16.5v-5M12.5 13l1.5-1.5 1.5 1.5" />
  </>
);
export const FolderTree = make(
  "FolderTree",
  <>
    <path d="M4.5 4v12a1 1 0 0 0 1 1h4.5M4.5 8.5h5.5" />
    <rect x="11" y="5.5" width="9" height="5" rx="1" />
    <rect x="11" y="14.5" width="9" height="5" rx="1" />
  </>
);
export const Keyboard = make(
  "Keyboard",
  <>
    <rect x="2.75" y="6" width="18.5" height="12" rx="2" />
    <path
      d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8"
      strokeWidth={2}
    />
  </>
);
export const Pin = make(
  "Pin",
  <path d="M9 4h6M10 4v5l-3 4h10l-3-4V4M12 13v7" />
);
export const PinOff = make(
  "PinOff",
  <path d="M9 4h6M10 4v5l-3 4h10l-3-4V4M12 13v7M4 4l16 16" />
);
export const Eye = make(
  "Eye",
  <>
    <path d="M2.75 12S6.25 5.75 12 5.75 21.25 12 21.25 12 17.75 18.25 12 18.25 2.75 12 2.75 12Z" />
    <circle cx="12" cy="12" r="2.75" />
  </>
);
export const ZoomIn = make(
  "ZoomIn",
  <>
    <circle cx="10.75" cy="10.75" r="6.25" />
    <path d="m15.4 15.4 4.6 4.6M8.25 10.75h5M10.75 8.25v5" />
  </>
);
export const ZoomOut = make(
  "ZoomOut",
  <>
    <circle cx="10.75" cy="10.75" r="6.25" />
    <path d="m15.4 15.4 4.6 4.6M8.25 10.75h5" />
  </>
);
export const Maximize = make(
  "Maximize",
  <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
);
export const Minimize = make(
  "Minimize",
  <path d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5" />
);
/** Scan brackets over ruled lines: find a value's source on the document. */
export const ScanText = make(
  "ScanText",
  <path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5M8.5 10h7M8.5 14h4.5" />
);
export const Play = make("Play", <path d="M7.5 5.25 18.5 12l-11 6.75Z" />);
export const MonitorPlay = make(
  "MonitorPlay",
  <>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M9 21h6M12 17v4M10.5 8.25 14.5 10.5l-4 2.25Z" />
  </>
);
export const BookOpen = make(
  "BookOpen",
  <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5ZM12 6.5v13" />
);
export const Lightbulb = make(
  "Lightbulb",
  <path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.5 10.9c.6.45 1 1.15 1 1.9V16h5v-.2c0-.75.4-1.45 1-1.9A6 6 0 0 0 12 3Z" />
);
export const Calendar = make(
  "Calendar",
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </>
);
export const CalendarDays = make(
  "CalendarDays",
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <Dot x={8} y={14} r={0.95} />
    <Dot x={12} y={14} r={0.95} />
    <Dot x={16} y={14} r={0.95} />
    <Dot x={8} y={17.25} r={0.95} />
    <Dot x={12} y={17.25} r={0.95} />
  </>
);

/* Domain ------------------------------------------------------------------ */
export const Wallet = make(
  "Wallet",
  <>
    <path d="M4 7.5a2 2 0 0 1 2-2h11.5v3.5" />
    <path d="M4 7.5V18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5H6a2 2 0 0 1-2-2Z" />
    <Dot x={16.5} y={14.25} r={1.05} />
  </>
);
export const Banknote = make(
  "Banknote",
  <>
    <rect x="2.75" y="6" width="18.5" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 9.5v.01M18 14.5v.01" strokeWidth={2} />
  </>
);
export const Landmark = make(
  "Landmark",
  <path d="M3.5 20h17M4 9.5h16L12 4.5ZM6.5 10v7M10 10v7M14 10v7M17.5 10v7" />
);
export const Building2 = make(
  "Building2",
  <path d="M5.5 21V4a1 1 0 0 1 1-1h7.5a1 1 0 0 1 1 1v17M15 9h3.5a1 1 0 0 1 1 1v11M3 21h18M8.5 7h3M8.5 11h3M8.5 15h3" />
);
export const Package = make(
  "Package",
  <path d="m12 3.25 8 4.5v8.5l-8 4.5-8-4.5v-8.5ZM4 7.75l8 4.5 8-4.5M12 12.25v8.5M8 5.5l8 4.5" />
);
export const ShoppingBag = make(
  "ShoppingBag",
  <path d="M5.5 8h13l-.9 11.1a1 1 0 0 1-1 .9H7.4a1 1 0 0 1-1-.9ZM9 8V6.5a3 3 0 0 1 6 0V8" />
);
export const ShoppingCart = make(
  "ShoppingCart",
  <>
    <path d="M3 4h2.5l2.1 10.6a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.75L20 7.5H6.3" />
    <circle cx="9" cy="19.5" r="1.25" />
    <circle cx="17" cy="19.5" r="1.25" />
  </>
);
export const LayoutDashboard = make(
  "LayoutDashboard",
  <>
    <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
    <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
  </>
);
/** Double-ruled ledger page, used for the Accounting nav group. */
export const Ledger = make(
  "Ledger",
  <>
    <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
    <path d="M8.5 3.5v17M11 8.5h5.5M11 12h5.5M11 15.5h3" />
  </>
);
export const UserRound = make(
  "UserRound",
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </>
);
export const UserCog = make(
  "UserCog",
  <>
    <circle cx="10" cy="8" r="3.75" />
    <path d="M3.5 20a6.5 6.5 0 0 1 9.5-5.75" />
    <circle cx="18" cy="17" r="2" />
    <path d="M18 13.5v1.25M18 19.25v1.25M14.5 17h1.25M20.25 17h1.25" />
  </>
);
export const HardDrive = make(
  "HardDrive",
  <>
    <path d="M3 13.5 6 5.5h12l3 8V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1ZM3 13.5h18" />
    <path d="M7 17h.01M10.5 17h.01" strokeWidth={2} />
  </>
);
export const PanelLeftClose = make(
  "PanelLeftClose",
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M9.5 4.5v15M16 9.5 13.5 12l2.5 2.5" />
  </>
);
export const PanelLeftOpen = make(
  "PanelLeftOpen",
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M9.5 4.5v15M13.5 9.5 16 12l-2.5 2.5" />
  </>
);
export const Settings = make(
  "Settings",
  <>
    <circle
      cx="12"
      cy="12"
      r="7.9"
      strokeWidth={2.6}
      strokeDasharray="2.6 3.6"
      strokeLinecap="butt"
    />
    <circle cx="12" cy="12" r="5.6" />
    <circle cx="12" cy="12" r="2.1" />
  </>
);
export const Command = make(
  "Command",
  <path d="M15 6.5v11a2.5 2.5 0 1 0 2.5-2.5h-11A2.5 2.5 0 1 0 9 17.5v-11A2.5 2.5 0 1 0 6.5 9h11A2.5 2.5 0 1 0 15 6.5Z" />
);
export const Sun = make(
  "Sun",
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.45 5.45l1.4 1.4M17.15 17.15l1.4 1.4M5.45 18.55l1.4-1.4M17.15 6.85l1.4-1.4" />
  </>
);
export const Moon = make(
  "Moon",
  <path d="M19.5 14.5A7.75 7.75 0 0 1 9.5 4.5a7.75 7.75 0 1 0 10 10Z" />
);
export const Stamp = make(
  "Stamp",
  <path d="M9.5 4.5h5v5l1.5 3.5h3a1 1 0 0 1 1 1v2H4v-2a1 1 0 0 1 1-1h3l1.5-3.5ZM5 20h14" />
);

/* Name aliases kept for drop-in compatibility ----------------------------- */
export const AlertCircle = CircleAlert;
export const AlertTriangle = TriangleAlert;
export const LoaderCircle = Loader2;
export const Loader2Icon = Loader2;
export const Loader = Loader2;
export const MoreHorizontal = Ellipsis;
export const MoreVertical = EllipsisVertical;
export const RefreshCcw = RefreshCw;
export const Edit2 = Pencil;
export const XIcon = X;
export const CheckIcon = Check;
export const MinusIcon = Minus;
export const ChevronDownIcon = ChevronDown;
export const ChevronUpIcon = ChevronUp;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronRightIcon = ChevronRight;
export const CaretDownIcon = CaretDown;
export const DotFilledIcon = DotFilled;
export const DragHandleDots2Icon = GripVertical;
export const Expand = Maximize;

/* Shell glyphs added for the Precision Indigo shell ------------------------- */
export const ChevronsUpDown = make(
  "ChevronsUpDown",
  <path d="m8 9 4-4 4 4M8 15l4 4 4-4" />
);
export const Bell = make(
  "Bell",
  <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15ZM10 20.5a2 2 0 0 0 4 0" />
);
export const Coins = make(
  "Coins",
  <>
    <circle cx="9" cy="9" r="5.5" />
    <path d="M15.9 9.6a5.5 5.5 0 1 1-6.3 6.3" />
  </>
);
export const Boxes = make(
  "Boxes",
  <>
    <rect x="8" y="3.75" width="8" height="7.25" rx="1" />
    <rect x="3.5" y="13" width="8" height="7.25" rx="1" />
    <rect x="12.5" y="13" width="8" height="7.25" rx="1" />
  </>
);
export const Percent = make(
  "Percent",
  <>
    <path d="M18.5 5.5 5.5 18.5" />
    <circle cx="7.25" cy="7.25" r="2.25" />
    <circle cx="16.75" cy="16.75" r="2.25" />
  </>
);
export const ReceiptText = Receipt;

/* Automation (13 Oct 2026) ------------------------------------------------ */
/** Two ledger nodes joined by a routed line: work the system runs on its own. */
export const Workflow = make(
  "Workflow",
  <>
    <rect x="3.5" y="3.5" width="7" height="6" rx="2" />
    <rect x="13.5" y="14.5" width="7" height="6" rx="2" />
    <path d="M7 9.5v4a2 2 0 0 0 2 2h4.5" />
  </>
);
/** A clock turning back: what happened, in order. */
export const History = make(
  "History",
  <>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 3.5v5h5" />
    <path d="M12 8v4l2.75 1.75" />
  </>
);
/** A checklist with ticks: a playbook of steps. */
export const ListChecks = make(
  "ListChecks",
  <path d="M3.5 6.5 5 8l2.5-2.5M3.5 13.5 5 15l2.5-2.5M11 7h9.5M11 14h9.5M11 19.5h9.5" />
);
/** A ruled page with a seal: the client's written policy. */
export const ScrollText = make(
  "ScrollText",
  <>
    <path d={PAGE} />
    <path d={FOLD} />
    <path d="M8.5 11h7M8.5 14h7M8.5 17h4" />
  </>
);
/** A lightning bolt: done without asking, because it has earned it. */
export const Zap = make(
  "Zap",
  <path d="M13 3 5 13.5h6.5L10.5 21 19 10.5h-6.5L13 3Z" />
);
/** A ledger-rule stamp: a rule the user set. */
export const Wand2 = make(
  "Wand2",
  <path d="m4 20 10-10M14 4v3M19 9h-3M17.5 5.5l-2 2M12 6.5l1.5 1.5M17 11l1.5 1.5" />
);
export const Square = make(
  "Square",
  <rect x="5" y="5" width="14" height="14" rx="1" />
);
export const Pause = make(
  "Pause",
  <>
    <path d="M8 5v14M16 5v14" />
  </>
);
export const Crosshair = make(
  "Crosshair",
  <>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
  </>
);
export const ArrowUpRight = make(
  "ArrowUpRight",
  <path d="M6 18 18 6M6 6h12v12" />
);
export const CornerDownLeft = make(
  "CornerDownLeft",
  <path d="M19 4v8H5m5-5-5 5 5 5" />
);
export const MessageSquare = make(
  "MessageSquare",
  <path d="M4 4h16v12H8l-4 4V4Z" />
);
export const SquarePen = make(
  "SquarePen",
  <>
    <path d="M10 4H4v16h16v-6M10 14l1-5 8-8 4 4-8 8-5 1Z" />
  </>
);

/* Neo chat (19 Oct 2026): rating an answer and starring a chat. */
export const ThumbsUp = make(
  "ThumbsUp",
  <>
    <path d="M7 10v11" />
    <path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 7A2 2 0 0 1 17.5 21H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h2.8a2 2 0 0 0 1.8-1.1L12 3a3 3 0 0 1 3 2.9Z" />
  </>
);
export const ThumbsDown = make(
  "ThumbsDown",
  <>
    <path d="M17 14V3" />
    <path d="M9 18.1 10 14H4.2a2 2 0 0 1-1.9-2.6l2.3-7A2 2 0 0 1 6.5 3H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2.8a2 2 0 0 0-1.8 1.1L12 21a3 3 0 0 1-3-2.9Z" />
  </>
);
export const Star = make(
  "Star",
  <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
);
