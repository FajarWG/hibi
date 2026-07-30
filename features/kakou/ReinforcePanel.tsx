"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CheckCircleIcon,
  CircleIcon,
  ClipboardTextIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { checkWriting } from "@/features/kakou/check";
import { submitReinforcement } from "@/features/kakou/actions";

type Word = { term: string; reading: string; meaning: string };

export function ReinforcePanel({ words }: { words: Word[] }) {
  const [text, setText] = useState("");
  const [tier, setTier] = useState<"mechanical" | "paste-back">("mechanical");
  const [pasteBack, setPasteBack] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // expectedForms = kata target, jadi checkWriting menambah cek "mengandung X".
  const checks = useMemo(
    () =>
      checkWriting(text, {
        pattern: "",
        expectedForms: words.map((word, index) => ({
          kind: `word-${index}`,
          match: word.term,
          label: word.term,
        })),
      }),
    [text, words],
  );

  function copyPrompt() {
    const list = words.map((w) => w.term).join("、");
    const prompt = [
      `Anda guru bahasa Jepang. Koreksi kalimat yang memakai kata: ${list}.`,
      `Kalimat: ${text || "(kosong)"}`,
      `Balas HANYA JSON: {"corrections":[{"issue":"","suggestion":"","category":""}]}`,
    ].join("\n");
    void navigator.clipboard?.writeText(prompt);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      let corrections: unknown[] = [];
      if (tier === "paste-back") {
        try {
          const parsed = JSON.parse(pasteBack) as { corrections?: unknown[] };
          corrections = parsed.corrections ?? [];
        } catch {
          setError("JSON tidak valid. Tempel blok JSON dari AI eksternal.");
          return;
        }
      }
      try {
        const res = await submitReinforcement({
          words: words.map((w) => w.term),
          text,
          tier,
          corrections,
        });
        setDone(`Tersimpan. ${res.weaknessesUpdated} titik lemah diperbarui.`);
      } catch {
        setError("Gagal menyimpan. Periksa format koreksi lalu coba lagi.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Tulis satu kalimat yang memakai semua kata berikut:
        </p>
        <ul className="flex flex-wrap gap-2">
          {words.map((word) => (
            <li
              key={word.term}
              className="rounded-lg border border-border px-2.5 py-1.5 text-sm"
            >
              <span lang="ja" className="font-jp font-medium">
                {word.term}
              </span>{" "}
              <span lang="ja" className="font-jp text-xs text-muted-foreground">
                {word.reading}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                · {word.meaning}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <textarea
        lang="ja"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="全部の単語を使って書いてください…"
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
        </div>
        {tier === "paste-back" && (
          <div className="space-y-2">
            <Button type="button" variant="outline" size="sm" onClick={copyPrompt}>
              <ClipboardTextIcon /> Copy prompt
            </Button>
            <textarea
              value={pasteBack}
              onChange={(e) => setPasteBack(e.target.value)}
              placeholder="Tempel balasan JSON dari AI di sini"
              rows={4}
              className="w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
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
