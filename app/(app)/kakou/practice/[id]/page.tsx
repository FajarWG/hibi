import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  WritingPanel,
  type PracticeGrammar,
} from "@/features/kakou/WritingPanel";

export const metadata: Metadata = { title: "Practice" };

export default async function PracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const point = await prisma.grammarPoint.findUnique({
    where: { id },
    select: {
      id: true,
      level: true,
      pattern: true,
      meaningId: true,
      frame: true,
      writingTask: true,
      expectedForms: true,
      commonMistakes: true,
      examples: true,
    },
  });
  if (!point) notFound();

  const grammar: PracticeGrammar = {
    id: point.id,
    level: point.level,
    pattern: point.pattern,
    meaningId: point.meaningId,
    frame: point.frame,
    writingTask: point.writingTask,
    expectedForms: (point.expectedForms as PracticeGrammar["expectedForms"]) ?? null,
    commonMistakes:
      (point.commonMistakes as PracticeGrammar["commonMistakes"]) ?? null,
    examples: (point.examples as PracticeGrammar["examples"]) ?? [],
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/kakou"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon /> Library
      </Link>
      <WritingPanel grammar={grammar} />
    </div>
  );
}
