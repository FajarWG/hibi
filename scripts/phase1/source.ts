import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Client } from "pg";

import type {
  DekiruCard,
  LegacyAnkiCard,
  LegacyProgress,
  LegacySnapshot,
  LegacyUser,
} from "@/scripts/phase1/types";

type RawExample = {
  kanji?: unknown;
  hiragana?: unknown;
  romaji?: unknown;
  translations?: Record<string, unknown>;
};

type RawSection = { examples?: RawExample[] };
type RawChapter = { chapter?: unknown; sections?: RawSection[] };

export async function loadLegacySnapshot(client: Client): Promise<LegacySnapshot> {
  const users = await client.query<LegacyUser>(`
    SELECT "id", "username", "password", "role"::text, "createdAt"
    FROM "User" ORDER BY "id"
  `);
  const cards = await client.query<LegacyAnkiCard>(`
    SELECT "id", "deckName", "kanji", "hiragana", "translation", "romaji",
           "audio", "sentence", "sentenceTranslation", "sentenceAudio",
           "image", "createdAt"
    FROM "AnkiCard" ORDER BY "id"
  `);
  const progress = await client.query<LegacyProgress>(`
    SELECT "id", "userId", "cardKey", "chapter", "sectionIndex", "interval",
           "ease", "repetitions", "dueDate", "createdAt", "updatedAt"
    FROM "AnkiProgress" ORDER BY "id"
  `);

  return {
    users: users.rows,
    customCards: cards.rows,
    progress: progress.rows,
  };
}

export function defaultDekiruSource(): string {
  return resolve(
    process.cwd(),
    "..",
    "src",
    "helper",
    "DekiruNihongoGroup.js",
  );
}

/**
 * Build the same exact key as Nihongo Flow. No split or normalization is
 * allowed: full-width chapter digits and literal `-` terms are significant.
 */
export async function loadDekiruCards(
  sourceFile = defaultDekiruSource(),
): Promise<{ cards: DekiruCard[]; duplicateKeys: string[] }> {
  const imported: unknown = await import(pathToFileURL(sourceFile).href);
  const groups = (imported as { DekiruNihongoGroups?: RawChapter[] })
    .DekiruNihongoGroups;
  if (!Array.isArray(groups)) {
    throw new Error(`DekiruNihongoGroups not found in ${sourceFile}`);
  }

  const cards: DekiruCard[] = [];
  const seen = new Set<string>();
  const duplicateKeys = new Set<string>();
  let sourceOrder = 0;

  for (const chapter of groups) {
    if (typeof chapter.chapter !== "string" || !Array.isArray(chapter.sections)) {
      throw new Error("Invalid Dekiru chapter shape");
    }

    const chapterName = chapter.chapter;
    chapter.sections.forEach((section, sectionIndex) => {
      if (!Array.isArray(section.examples)) return;
      for (const example of section.examples) {
        if (
          typeof example.kanji !== "string" ||
          typeof example.hiragana !== "string"
        ) {
          throw new Error(`Invalid Dekiru example in ${chapterName}`);
        }

        const cardKey = `Bab ${chapterName.replace("Bab ", "")}-${sectionIndex}-${example.kanji}-${example.hiragana}`;
        const idMeaning = example.translations?.id;
        const enMeaning = example.translations?.en;
        const translation =
          typeof idMeaning === "string"
            ? idMeaning
            : typeof enMeaning === "string"
              ? enMeaning
              : "No translation";

        if (seen.has(cardKey)) duplicateKeys.add(cardKey);
        seen.add(cardKey);
        cards.push({
          cardKey,
          chapter: chapterName,
          sectionIndex,
          sourceOrder,
          kanji: example.kanji,
          hiragana: example.hiragana,
          romaji:
            typeof example.romaji === "string" && example.romaji.length > 0
              ? example.romaji
              : null,
          translation,
        });
        sourceOrder += 1;
      }
    });
  }

  return { cards, duplicateKeys: [...duplicateKeys].sort() };
}
