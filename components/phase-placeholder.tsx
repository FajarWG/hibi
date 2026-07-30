import Link from "next/link";

import { Button } from "@/components/ui/button";

/** A transparent placeholder for routes scheduled in later phases. */
export function PhasePlaceholder({
  title,
  phase,
  description,
  scope,
}: {
  title: string;
  phase: string;
  description: string;
  scope: string[];
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div className="space-y-2">
        <p className="font-mono text-xs text-primary">{phase}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium">Planned for this page</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground marker:text-border">
          {scope.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <Button asChild variant="outline" size="sm">
        <Link href="/today">Back to Today</Link>
      </Button>
    </div>
  );
}
