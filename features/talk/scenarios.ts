/**
 * Skenario roleplay bertahap + level untuk AI Conversation. Murni (dipakai
 * server saat membangun system prompt dan client untuk pemilih skenario).
 */

export type TalkLevel = "N5" | "N4" | "N3";

export const TALK_LEVELS: {
  id: TalkLevel;
  label: string;
  description: string;
}[] = [
  { id: "N5", label: "N5", description: "Kalimat pendek, kosakata dasar." },
  { id: "N4", label: "N4", description: "Percakapan sehari-hari." },
  { id: "N3", label: "N3", description: "Topik lebih luas, tempo alami." },
];

export type TalkScenario = {
  id: string;
  title: string;
  description: string;
  stages: string[];
};

export const TALK_SCENARIOS: TalkScenario[] = [
  {
    id: "self-intro",
    title: "Perkenalan diri",
    description: "Bertemu orang baru.",
    stages: ["Salam", "Nama & asal", "Hobi & pekerjaan", "Menutup percakapan"],
  },
  {
    id: "restaurant",
    title: "Restoran",
    description: "Memesan makanan di kedai.",
    stages: ["Meminta meja", "Memesan", "Meminta rekomendasi", "Membayar"],
  },
  {
    id: "shopping",
    title: "Belanja",
    description: "Berbelanja di toko.",
    stages: ["Mencari barang", "Menanyakan harga", "Meminta ukuran lain", "Membayar"],
  },
  {
    id: "directions",
    title: "Menanyakan arah",
    description: "Tersesat di kota.",
    stages: ["Menyapa", "Menanyakan lokasi", "Konfirmasi rute", "Berterima kasih"],
  },
  {
    id: "hotel",
    title: "Hotel",
    description: "Dari reservasi sampai check-out.",
    stages: ["Reservasi", "Check-in", "Keluhan kamar", "Check-out"],
  },
];

export function getScenario(id: string): TalkScenario | undefined {
  return TALK_SCENARIOS.find((scenario) => scenario.id === id);
}

const LEVEL_STYLE: Record<TalkLevel, string> = {
  N5: "kalimat pendek dan sederhana, kosakata dasar, tempo pelan",
  N4: "percakapan sehari-hari dengan kalimat majemuk sederhana",
  N3: "topik lebih luas dengan tempo yang lebih alami",
};

export function buildSystemPrompt(
  level: TalkLevel,
  scenario: TalkScenario,
  vocab: string[] = [],
): string {
  return [
    `Anda mitra percakapan bahasa Jepang untuk siswa level JLPT ${level}.`,
    `Skenario roleplay: ${scenario.title} (${scenario.description}). Pandu bertahap: ${scenario.stages.join(" → ")}.`,
    `Bicaralah HANYA dalam bahasa Jepang yang sesuai level ${level}: ${LEVEL_STYLE[level]}.`,
    "Jaga tiap giliran tetap singkat. Bila siswa keliru pada hal penting, koreksi dengan lembut lalu lanjutkan percakapan.",
    vocab.length > 0
      ? `Sedapat mungkin pakai kosakata yang sedang dipelajari siswa: ${vocab.join("、")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}
