import { Check, Command, FolderSync, NeedsYou, Settings, Split, Stamp, TickAi, TickYou, Unlink } from "@/components/icons";

/** Dev-only: the signature and dense glyphs, enlarged for optical review. */
const SET = { TickAi, TickYou, NeedsYou, Check, Command, FolderSync, Settings, Split, Stamp, Unlink };
export default function Zoom() {
  return (
    <main className="flex flex-wrap gap-6 bg-background p-6">
      {Object.entries(SET).map(([n, I]) => (
        <div key={n} className="flex flex-col items-center gap-2">
          <div className="flex items-end gap-3">
            <I className="h-4 w-4" />
            <I className="h-12 w-12" />
          </div>
          <span className="text-caption-1">{n}</span>
        </div>
      ))}
    </main>
  );
}
