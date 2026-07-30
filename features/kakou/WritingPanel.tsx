"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CheckCircleIcon,
  CircleIcon,
  ClipboardTextIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { checkWriting, type ExpectedForm } from "@/features/kakou/check";
import { submitWriting } from "@/features/kakou/actions";

type CommonMistake = { bad: string; good: string; noteId: string };
type Example = { jp: string; kana: string; meaningId: string };

export type PracticeGrammar = {
  id: string;
  level: string;
  pattern: string;
  meaningId: string;
  frame: string | null;
  writingTask: string;
  expectedForms: ExpectedForm[] | null;
  commonMistakes: CommonMistake[] | null;
  examples: Example[];
};

export function WritingPanel({ grammar }: { grammar: PracticeGrammar }) {
  const [text, setText] = useState("");
  const [tier, setTier] = useState<"mechanical" | "paste-back" | "ai">(
    "mechanical",
  );
  const [pasteBack, setPasteBack] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();

  const checks = useMemo(() => checkWriting(text, grammar), [text, grammar]);
  const mistakes = grammar.commonMistakes ?? [];
  const flaggedWeak = mistakes.length > 0 && checked.size < mistakes.length;

  function toggleMistake(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function copyPrompt() {
    const prompt = [
      `Anda guru bahasa Jepang. Koreksi kalimat yang memakai pola「${grammar.pattern}」(${grammar.meaningId}).`,
      `Kalimat: ${text || "(kosong)"}`,
      `Balas HANYA JSON: {"corrections":[{"issue":"","suggestion":"","category":""}],"scores":{"accuracy":0,"complexity":0,"naturalness":0}}`,
    ].join("\n");
    void navigator.clipboard?.writeText(prompt);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      let corrections: unknown[] = [];
      let scores: unknown = null;

      if (tier === "paste-back") {
        try {
          const parsed = JSON.parse(pasteBack) as {
            corrections?: unknown[];
            scores?: unknown;
          };
          corrections = parsed.corrections ?? [];
          scores = parsed.scores ?? null;
        } catch {
          setError("JSON tidak valid. Tempel blok JSON dari AI eksternal.");
          return;
        }
      } else if (tier === "ai") {
        try {
          const resp = await fetch("/api/ai/writing-review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              pattern: grammar.pattern,
              meaning: grammar.meaningId,
            }),
          });
          if (!resp.ok) {
            setError(
              resp.status === 503
                ? "AI tidak aktif (GEMINI_API_KEY kosong)."
                : resp.status === 429
                  ? "Terlalu banyak permintaan. Coba lagi sebentar."
                  : "Review AI gagal. Coba tingkat lain.",
            );
            return;
          }
          const data = (await resp.json()) as {
            corrections?: unknown[];
            scores?: unknown;
          };
          corrections = data.corrections ?? [];
          scores = data.scores ?? null;
        } catch {
          setError("Tidak dapat menghubungi layanan AI.");
          return;
        }
      }

      try {
        const res = await submitWriting({
          grammarId: grammar.id,
          text,
          tier,
          corrections,
          scores,
          flaggedWeak,
        });
        const scoreNote =
          scores && typeof scores === "object" && "accuracy" in scores
            ? ` Akurasi ${(scores as { accuracy: number }).accuracy}.`
            : "";
        setDone(
          `Tersimpan. ${res.weaknessesUpdated} titik lemah diperbarui.${scoreNote}`,
        );
      } catch {
        setError("Gagal menyimpan. Periksa format koreksi lalu coba lagi.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
            {grammar.level}
          </span>
          <h1 lang="ja" className="font-jp text-lg font-semibold">
            {grammar.pattern}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{grammar.meaningId}</p>
        <p className="text-sm">{grammar.writingTask}</p>
        {grammar.frame && (
          <p lang="ja" className="font-jp text-sm text-muted-foreground">
            {grammar.frame}
          </p>
        )}
        {grammar.examples.length > 0 && (
          <ul className="space-y-1 border-t border-border pt-2">
            {grammar.examples.slice(0, 2).map((ex, i) => (
              <li key={i} lang="ja" className="font-jp text-sm">
                {ex.jp}
                <span className="ml-2 font-sans text-xs text-muted-foreground">
                  {ex.meaningId}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <textarea
        lang="ja"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="1文以上書いてください…"
        rows={4}
        className="w-full resize-y rounded-lg border border-border bg-background p-3 font-jp text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      <section className="grid gap-2 sm:grid-cols-2">
        {checks.map((check) => (
          <div key={check.id} className="flex items-center gap-2 text-sm">
            {check.passed ? (
              <CheckCircleIcon weight="fill" className="text-grade-good" />
            ) : (
              <CircleIcon className="text-muted-foreground" />
            )}
            <span className={cn(!check.passed && "text-muted-foreground")}>
              {check.label}
            </span>
          </div>
        ))}
      </section>

      {mistakes.length > 0 && (
        <section className="space-y-2 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">Self-review: hindari kesalahan ini</p>
          <ul className="space-y-1.5">
            {mistakes.map((mistake, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked.has(i)}
                    onChange={() => toggleMistake(i)}
                    className="mt-1"
                  />
                  <span>
                    <span lang="ja" className="font-jp">
                      {mistake.bad} → {mistake.good}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {mistake.noteId}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex gap-2" role="group" aria-label="Review mode">
          <Button
            type="button"
            variant={tier === "mechanical" ? "default" : "outline"}
            size="sm"
            onClick={() => setTier("mechanical")}
          >
            Mechanical
          </Button>
          <Button
            type="button"
            variant={tier === "paste-back" ? "default" : "outline"}
            size="sm"
            onClick={() => setTier("paste-back")}
          >
            Paste-back AI
          </Button>
          <Button
            type="button"
            variant={tier === "ai" ? "default" : "outline"}
            size="sm"
            onClick={() => setTier("ai")}
          >
            AI review
          </Button>
        </div>

        {tier === "paste-back" && (
          <div className="space-y-2">
            <Button type="button" variant="outline" size="sm" onClick={copyPrompt}>
              <ClipboardTextIcon /> Copy prompt
            </Button>
            <textarea
              value={pasteBack}
              onChange={(e) => setPasteBack(e.target.value)}
              placeholder='Tempel balasan JSON dari AI di sini'
              rows={4}
              className="w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        )}

        {tier === "ai" && (
          <p className="text-sm text-muted-foreground">
            AI akan mereview tulisan Anda lalu menyimpan koreksi dan skor.
          </p>
        )}
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {done && <p className="text-sm text-grade-good">{done}</p>}

      <Button
        type="button"
        onClick={submit}
        disabled={pending || text.trim().length === 0}
        size="lg"
      >
        {pending ? "Saving…" : "Save session"}
      </Button>
    </div>
  );
}
