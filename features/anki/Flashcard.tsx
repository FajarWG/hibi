"use client";

import { useCallback } from "react";
import { motion } from "motion/react";
import { SpeakerHighIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import type { ReviewCardDto } from "@/features/anki/types";

function mediaSrc(file: string): string {
  return `/anki-media/${file}`;
}

function AudioButton({ file }: { file: string }) {
  const play = useCallback(() => {
    const audio = new Audio(mediaSrc(file));
    void audio.play().catch(() => {});
  }, [file]);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={play}
      aria-label="Play audio"
    >
      <SpeakerHighIcon weight="bold" />
    </Button>
  );
}

type FlashcardProps = {
  card: ReviewCardDto;
  revealed: boolean;
  onReveal: () => void;
};

export function Flashcard({ card, revealed, onReveal }: FlashcardProps) {
  if (card.kind === "KANJI" && card.kanji) {
    return (
      <KanjiCard
        kanji={card.kanji}
        direction={card.direction}
        revealed={revealed}
        onReveal={onReveal}
      />
    );
  }
  const vocab = card.vocab;
  if (!vocab) return null;

  return (
    <div className="flex min-h-[16rem] flex-col rounded-xl border border-border bg-card p-6 sm:p-8">
      <p className="font-mono text-[0.7rem] tracking-wide text-muted-foreground">
        {vocab.deck}
      </p>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
        <h2 lang="ja" className="font-jp text-4xl font-semibold sm:text-5xl">
          {vocab.term}
        </h2>

        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full space-y-4"
          >
            <div className="flex items-center justify-center gap-2">
              <p lang="ja" className="font-jp text-lg text-primary">
                {vocab.reading}
              </p>
              {vocab.audioFile && <AudioButton file={vocab.audioFile} />}
            </div>

            <p className="text-balance text-base">{vocab.meaning}</p>

            {vocab.imageFile && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaSrc(vocab.imageFile)}
                alt=""
                className="mx-auto max-h-40 w-auto rounded-lg"
                loading="lazy"
              />
            )}

            {vocab.sentence && (
              <div className="mx-auto max-w-[46ch] space-y-1 border-t border-border pt-4">
                {/* Kalimat sudah disanitasi saat ETL (allowlist ketat),
                    lihat scripts/phase1/transform.ts. Aman dirender. */}
                <p
                  lang="ja"
                  className="font-jp text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: vocab.sentence }}
                />
                {vocab.sentenceMeaning && (
                  <p className="text-sm text-muted-foreground">
                    {vocab.sentenceMeaning}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {!revealed && (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={onReveal}
        >
          Show answer
          <span className="ml-1.5 font-mono text-[0.65rem] opacity-60">
            Space
          </span>
        </Button>
      )}
    </div>
  );
}


function KanjiCard({
  kanji,
  direction,
  revealed,
  onReveal,
}: {
  kanji: NonNullable<ReviewCardDto["kanji"]>;
  direction: "RECOGNIZE" | "RECALL";
  revealed: boolean;
  onReveal: () => void;
}) {
  const recall = direction === "RECALL";
  const examples =
    kanji.examples && kanji.examples.length > 0 ? (
      <ul className="mx-auto max-w-[40ch] space-y-1 border-t border-border pt-3 text-sm">
        {kanji.examples.slice(0, 4).map((ex, index) => (
          <li key={index} lang="ja" className="font-jp">
            {ex.word} <span className="text-muted-foreground">{ex.yomi}</span>
            <span className="ml-1 font-sans text-xs text-muted-foreground">
              {ex.imi}
            </span>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div className="flex min-h-[16rem] flex-col rounded-xl border border-border bg-card p-6 sm:p-8">
      <p className="font-mono text-[0.7rem] tracking-wide text-muted-foreground">
        Chapter {kanji.chapter} ·{" "}
        <span lang="ja" className="font-jp">
          {kanji.topic}
        </span>
        {recall && " · Recall"}
      </p>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
        {recall ? (
          <>
            <p className="text-sm text-muted-foreground">Tulis kanji untuk:</p>
            <h2 className="text-balance text-2xl font-semibold">
              {kanji.meaning}
            </h2>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="w-full space-y-2"
              >
                <p lang="ja" className="font-jp text-6xl font-semibold">
                  {kanji.character}
                </p>
                <p lang="ja" className="font-jp text-lg text-primary">
                  {kanji.readings}
                </p>
                {examples}
              </motion.div>
            )}
          </>
        ) : (
          <>
            <h2 lang="ja" className="font-jp text-6xl font-semibold sm:text-7xl">
              {kanji.character}
            </h2>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="w-full space-y-3"
              >
                <p lang="ja" className="font-jp text-lg text-primary">
                  {kanji.readings}
                </p>
                <p className="text-base">{kanji.meaning}</p>
                {examples}
              </motion.div>
            )}
          </>
        )}
      </div>

      {!revealed && (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={onReveal}
        >
          {recall ? "Show kanji" : "Show reading"}
          <span className="ml-1.5 font-mono text-[0.65rem] opacity-60">
            Space
          </span>
        </Button>
      )}
    </div>
  );
}
