"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  CheckCircleIcon,
  ClipboardTextIcon,
  CameraIcon,
  NotePencilIcon,
  ArrowLeftIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExpectedForm } from "@/features/kakou/check";
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

type Correction = { issue: string; suggestion: string; category?: string };
type Scores = { accuracy: number; complexity: number; naturalness: number };
type PhotoResult = {
  transcript: string;
  corrections: Correction[];
  scores: Scores | null;
};

type Step = "write" | "photo" | "review";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

/** Tiga bagian tulisan yang dikerjakan di buku kertas. */
function buildParts(pattern: string): string[] {
  return [
    `Bagian 1: Tulis 1 kalimat sederhana yang memakai pola 「${pattern}」.`,
    `Bagian 2: Tulis 1 kalimat tentang kegiatan sehari-harimu memakai 「${pattern}」.`,
    `Bagian 3: Tulis paragraf pendek (2-3 kalimat) yang memakai 「${pattern}」.`,
  ];
}

function readImageFile(
  file: File,
): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      resolve({ dataUrl, base64, mimeType: file.type });
    };
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

export function WritingPanel({ grammar }: { grammar: PracticeGrammar }) {
  const parts = useMemo(() => buildParts(grammar.pattern), [grammar.pattern]);

  const [step, setStep] = useState<Step>("write");
  const [partsDone, setPartsDone] = useState<boolean[]>([false, false, false]);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("");

  const [reviewMode, setReviewMode] = useState<"ai" | "manual">("ai");
  const [pasteBack, setPasteBack] = useState("");
  const [result, setResult] = useState<PhotoResult | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const allPartsDone = partsDone.every(Boolean);

  function togglePart(index: number) {
    setPartsDone((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.includes(file.type)) {
      setError("Format foto harus JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Foto terlalu besar (maks 6 MB). Kompres atau foto ulang.");
      return;
    }
    try {
      const { dataUrl, base64, mimeType: mt } = await readImageFile(file);
      setImageDataUrl(dataUrl);
      setImageBase64(base64);
      setMimeType(mt);
    } catch {
      setError("Gagal membaca foto. Coba lagi.");
    }
  }

  function manualPrompt(): string {
    return [
      "Kamu guru bahasa Jepang. Saya lampirkan FOTO tulisan tangan saya di buku catatan.",
      `Pola yang dilatih: 「${grammar.pattern}」(${grammar.meaningId}).`,
      "Tugas yang saya kerjakan:",
      ...parts.map((p) => `- ${p}`),
      "",
      "Baca tulisan tangan di foto, lalu balas HANYA JSON persis seperti ini:",
      `{"transcript":"<tulisan yang kamu baca>","corrections":[{"issue":"","suggestion":"","category":""}],"scores":{"accuracy":0,"complexity":0,"naturalness":0}}`,
    ].join("\n");
  }

  function copyPrompt() {
    void navigator.clipboard?.writeText(manualPrompt());
    setDone("Prompt disalin. Tempel di AI-mu bersama foto tadi.");
  }

  function runAiCheck() {
    setError(null);
    setDone(null);
    startTransition(async () => {
      try {
        const resp = await fetch("/api/ai/writing-photo-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64,
            mimeType,
            pattern: grammar.pattern,
            meaning: grammar.meaningId,
            parts,
          }),
        });
        if (!resp.ok) {
          const data = (await resp.json().catch(() => ({}))) as {
            error?: string;
          };
          if (resp.status === 429 && data.error === "quota_exhausted") {
            setReviewMode("manual");
            setError(
              "Kuota AI kita habis. Beralih ke mode manual: salin prompt lalu periksa foto di AI-mu sendiri.",
            );
          } else if (resp.status === 429) {
            setError("Terlalu banyak permintaan. Coba lagi sebentar.");
          } else if (resp.status === 503) {
            setError("AI tidak aktif di server. Gunakan mode manual.");
            setReviewMode("manual");
          } else {
            setError("Review AI gagal. Coba mode manual.");
          }
          return;
        }
        const data = (await resp.json()) as PhotoResult;
        setResult({
          transcript: data.transcript ?? "",
          corrections: data.corrections ?? [],
          scores: data.scores ?? null,
        });
      } catch {
        setError("Tidak dapat menghubungi layanan AI. Gunakan mode manual.");
        setReviewMode("manual");
      }
    });
  }

  function applyManualJson() {
    setError(null);
    try {
      const parsed = JSON.parse(pasteBack) as Partial<PhotoResult>;
      setResult({
        transcript: parsed.transcript ?? "",
        corrections: parsed.corrections ?? [],
        scores: parsed.scores ?? null,
      });
    } catch {
      setError("JSON tidak valid. Tempel blok JSON dari AI-mu.");
    }
  }

  function save() {
    if (!result) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await submitWriting({
          grammarId: grammar.id,
          text: "",
          tier: reviewMode === "ai" ? "photo" : "photo-manual",
          transcript: result.transcript,
          corrections: result.corrections,
          scores: result.scores,
          flaggedWeak: false,
        });
        const scoreNote = result.scores
          ? ` Akurasi ${result.scores.accuracy}.`
          : "";
        setDone(
          `Tersimpan. ${res.weaknessesUpdated} titik lemah diperbarui.${scoreNote}`,
        );
      } catch {
        setError("Gagal menyimpan. Coba lagi.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Kartu pola tata bahasa + referensi */}
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

      {/* Indikator langkah */}
      <ol className="flex items-center gap-2 text-xs font-medium">
        {(
          [
            ["write", "1. Tulis di kertas"],
            ["photo", "2. Foto & unggah"],
            ["review", "3. Periksa"],
          ] as const
        ).map(([id, label]) => (
          <li
            key={id}
            className={cn(
              "rounded-full border px-3 py-1",
              step === id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {label}
          </li>
        ))}
      </ol>

      {/* LANGKAH 1 — Tulis di buku kertas */}
      {step === "write" && (
        <section className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <NotePencilIcon
              weight="duotone"
              className="mt-0.5 shrink-0 text-primary"
              aria-hidden
            />
            <p>
              Tulis <strong>di buku catatanmu (kertas)</strong>, bukan di sini.
              Kerjakan ketiga bagian di bawah, lalu centang bila sudah selesai.
            </p>
          </div>

          <ul className="space-y-2">
            {parts.map((part, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={partsDone[i]}
                    onChange={() => togglePart(i)}
                    className="mt-0.5"
                  />
                  <span lang="ja" className="font-jp">
                    {part}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            size="lg"
            disabled={!allPartsDone}
            onClick={() => {
              setError(null);
              setStep("photo");
            }}
          >
            <CameraIcon weight="fill" /> Lanjut ke foto
          </Button>
          {!allPartsDone && (
            <p className="text-xs text-muted-foreground">
              Centang ketiga bagian setelah selesai menulis di kertas.
            </p>
          )}
        </section>
      )}

      {/* LANGKAH 2 — Foto buku & unggah */}
      {step === "photo" && (
        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Foto halaman buku catatanmu yang berisi ketiga bagian, lalu unggah
            di sini. Pastikan tulisan terbaca jelas.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={onPickImage}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <CameraIcon /> {imageDataUrl ? "Ganti foto" : "Pilih / ambil foto"}
          </Button>

          {imageDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageDataUrl}
              alt="Pratinjau tulisan tanganmu"
              className="max-h-80 w-auto rounded-lg border border-border"
            />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("write")}
            >
              <ArrowLeftIcon /> Kembali
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={!imageDataUrl}
              onClick={() => {
                setError(null);
                setResult(null);
                setStep("review");
              }}
            >
              Lanjut ke pemeriksaan
            </Button>
          </div>
        </section>
      )}

      {/* LANGKAH 3 — Periksa (AI otomatis / manual) */}
      {step === "review" && (
        <section className="space-y-4">
          <div className="flex gap-2" role="group" aria-label="Mode pemeriksaan">
            <Button
              type="button"
              variant={reviewMode === "ai" ? "default" : "outline"}
              size="sm"
              onClick={() => setReviewMode("ai")}
            >
              AI otomatis
            </Button>
            <Button
              type="button"
              variant={reviewMode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setReviewMode("manual")}
            >
              Manual (kuota habis)
            </Button>
          </div>

          {reviewMode === "ai" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                AI kita membaca foto tulisanmu lalu memeriksa tiap bagian.
              </p>
              <Button
                type="button"
                onClick={runAiCheck}
                disabled={pending || !imageBase64}
              >
                {pending ? "Memeriksa…" : "Periksa dengan AI"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Kuota AI kita habis? Salin prompt ini, buka AI milikmu (mis.
                ChatGPT/Gemini), unggah foto tadi beserta prompt, lalu tempel
                balasan JSON-nya di bawah.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyPrompt}
              >
                <ClipboardTextIcon /> Salin prompt
              </Button>
              <textarea
                value={pasteBack}
                onChange={(e) => setPasteBack(e.target.value)}
                placeholder="Tempel balasan JSON dari AI-mu di sini"
                rows={5}
                className="w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={applyManualJson}
                disabled={pasteBack.trim().length === 0}
              >
                Terapkan hasil
              </Button>
            </div>
          )}

          {/* Hasil pemeriksaan */}
          {result && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              {result.transcript && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Dibaca dari foto
                  </p>
                  <p lang="ja" className="whitespace-pre-wrap font-jp text-sm">
                    {result.transcript}
                  </p>
                </div>
              )}

              {result.scores && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {(
                    [
                      ["Akurasi", result.scores.accuracy],
                      ["Kompleksitas", result.scores.complexity],
                      ["Kealamian", result.scores.naturalness],
                    ] as const
                  ).map(([label, value]) => (
                    <span
                      key={label}
                      className="rounded-full bg-muted px-2.5 py-1 font-mono tabular-nums"
                    >
                      {label} {value}
                    </span>
                  ))}
                </div>
              )}

              {result.corrections.length > 0 ? (
                <ul className="space-y-2 border-t border-border pt-2">
                  {result.corrections.map((c, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-destructive">{c.issue}</span>
                      {c.suggestion && (
                        <span lang="ja" className="ml-1 font-jp">
                          → {c.suggestion}
                        </span>
                      )}
                      {c.category && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {c.category}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-1.5 border-t border-border pt-2 text-sm text-grade-good">
                  <CheckCircleIcon weight="fill" /> Tidak ada koreksi. Bagus!
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("photo")}
            >
              <ArrowLeftIcon /> Ganti foto
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={save}
              disabled={pending || !result}
            >
              {pending ? "Menyimpan…" : "Simpan sesi"}
            </Button>
          </div>
        </section>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {done && <p className="text-sm text-grade-good">{done}</p>}
    </div>
  );
}
