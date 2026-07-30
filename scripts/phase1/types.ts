export type LegacyRole = "USER" | "ADMIN";

export type LegacyUser = {
  id: number;
  username: string;
  password: string;
  role: LegacyRole;
  createdAt: Date;
};

export type ExistingHibiUser = {
  id: string;
  legacyId: number | null;
  username: string;
  role: LegacyRole;
};

export type UserSeed = {
  id: string;
  legacyId: number;
  username: string;
  passwordHash: string;
  role: LegacyRole;
  createdAt: Date;
  existing: boolean;
};

export type LegacyAnkiCard = {
  id: string;
  deckName: string;
  kanji: string;
  hiragana: string;
  translation: string;
  romaji: string | null;
  audio: string | null;
  sentence: string | null;
  sentenceTranslation: string | null;
  sentenceAudio: string | null;
  image: string | null;
  createdAt: Date;
};

export type LegacyProgress = {
  id: number;
  userId: number;
  cardKey: string;
  chapter: string;
  sectionIndex: number;
  interval: number;
  ease: number;
  repetitions: number;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type DekiruCard = {
  cardKey: string;
  chapter: string;
  sectionIndex: number;
  sourceOrder: number;
  kanji: string;
  hiragana: string;
  romaji: string | null;
  translation: string;
};

export type LegacySnapshot = {
  users: LegacyUser[];
  customCards: LegacyAnkiCard[];
  progress: LegacyProgress[];
};

export type VocabSeed = {
  id: string;
  legacyKey: string;
  legacyAnkiId: string | null;
  source: "CUSTOM" | "DEKIRU";
  deck: string;
  chapter: string | null;
  sectionIndex: number | null;
  sourceOrder: number | null;
  term: string;
  reading: string;
  meaning: string;
  romaji: string | null;
  audioFile: string | null;
  imageFile: string | null;
  sentence: string | null;
  sentenceMeaning: string | null;
  sentenceAudioFile: string | null;
  createdAt: Date;
};

export type ReviewItemSeed = {
  id: string;
  vocabId: string;
};

export type ReviewSeed = {
  id: string;
  userId: string;
  itemId: string;
  legacyProgressId: number;
  legacyCardKey: string;
  legacyInterval: number;
  legacyEase: number;
  legacyRepetitions: number;
  stability: number;
  difficulty: number;
  state: number;
  reps: number;
  lapses: number;
  scheduledDays: number;
  elapsedDays: number;
  lastReviewedAt: Date;
  dueAt: Date;
  createdAt: Date;
};

export type UnmatchedProgress = {
  progressId: number;
  legacyUserId: number;
  cardKey: string;
  reason: "USER_NOT_FOUND" | "CUSTOM_CARD_NOT_FOUND" | "DEKIRU_CARD_NOT_FOUND";
};

export type UserCollision = {
  legacyUserId: number;
  username: string;
  reason: string;
};

export type Phase1Report = {
  generatedAt: string;
  mode: "dry-run" | "apply";
  source: {
    users: number;
    customCards: number;
    dekiruCards: number;
    progress: number;
    progressCustom: number;
    progressDekiru: number;
    dueAtCutoff: number;
  };
  target: {
    usersPlanned: number;
    vocabCardsPlanned: number;
    reviewItemsPlanned: number;
    reviewStatesPlanned: number;
  };
  integrity: {
    duplicateDekiruKeys: string[];
    unmatchedProgress: UnmatchedProgress[];
    userCollisions: UserCollision[];
    customCardsWithoutProgress: number;
    dekiruCardsWithoutProgress: number;
  };
};
