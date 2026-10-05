import * as Icons from "@/components/icons";

/** Dev-only gallery of the Ledger icon set at 16 / 20 / 24px. */
const SKIP = new Set(["default"]);
const entries = Object.entries(Icons).filter(
  ([name, value]) =>
    !SKIP.has(name) && typeof value === "object" && "displayName" in value
);
const unique = entries.filter(
  ([name, value]) => (value as { displayName?: string }).displayName === name
);

export default function IconGallery() {
  return (
    <main className="h-full overflow-auto bg-canvas p-8 text-foreground">
      <h1 className="mb-1 text-h6 font-semibold">Ledger icon set</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {unique.length} glyphs · 24px grid · 1.6 stroke
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-px overflow-hidden rounded-lg border border-rule bg-rule">
        {unique.map(([name, value]) => {
          const Icon = value as Icons.IconComponent;
          return (
            <div key={name} className="flex flex-col items-center gap-3 bg-background px-2 py-4">
              <div className="flex items-end gap-3 text-foreground">
                <Icon className="h-4 w-4" />
                <Icon className="h-5 w-5" />
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-caption-1 text-muted-foreground">{name}</span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
