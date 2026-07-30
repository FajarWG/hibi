/**
 * Pengecekan mekanis tulisan (Kakou tingkat 3, tanpa AI). Murni & testable.
 * Memberi umpan balik objektif: ada isi, pakai aksara Jepang, panjang minimal,
 * diakhiri tanda baca, dan — bila `expectedForms` tersedia — bentuk/partikel
 * wajib muncul. Checklist self-review dari commonMistakes ditangani di UI.
 */

export type ExpectedForm = { kind: string; match: string; label: string };

export type GrammarForCheck = {
  pattern: string;
  expectedForms: ExpectedForm[] | null;
};

export type MechanicalCheck = {
  id: string;
  label: string;
  passed: boolean;
};

const KANA_KANJI = /[\u3040-\u30ff\u4e00-\u9faf]/;
const SENTENCE_END = /[。！？]\s*$/;
const MIN_LENGTH = 8;

export function checkWriting(
  text: string,
  grammar: GrammarForCheck,
): MechanicalCheck[] {
  const trimmed = text.trim();
  const checks: MechanicalCheck[] = [
    { id: "content", label: "Ada tulisan", passed: trimmed.length > 0 },
    {
      id: "japanese",
      label: "Menggunakan aksara Jepang",
      passed: KANA_KANJI.test(trimmed),
    },
    {
      id: "length",
      label: `Minimal ${MIN_LENGTH} karakter`,
      passed: trimmed.length >= MIN_LENGTH,
    },
    {
      id: "sentence-end",
      label: "Diakhiri tanda baca (。！？)",
      passed: SENTENCE_END.test(trimmed),
    },
  ];

  if (grammar.expectedForms) {
    for (const form of grammar.expectedForms) {
      checks.push({
        id: `form-${form.kind}`,
        label: `Mengandung ${form.label}`,
        passed: text.includes(form.match),
      });
    }
  }

  return checks;
}

export function passedAll(checks: MechanicalCheck[]): boolean {
  return checks.length > 0 && checks.every((check) => check.passed);
}

export function passedCount(checks: MechanicalCheck[]): number {
  return checks.filter((check) => check.passed).length;
}
