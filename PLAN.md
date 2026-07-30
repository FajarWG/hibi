# Hibi - Rencana Implementasi

> 日々 - "hari demi hari". Aplikasi belajar bahasa Jepang harian, dibangun ulang dari nol
> dengan 4 fitur yang ditarik dari Nihongo Flow: **Kakou**, **Anki**, **Kanji Tamago**, **AI Conversation**.

Status dokumen: aktif. **Fase 0 selesai** pada 2026-07-30; fase berikutnya adalah audit dan migrasi data Anki.
Tanggal: 2026-07-30

---

## 1. Tujuan

Bukan port 1:1. Tiga hal yang ingin dicapai:

1. **Satu mesin SRS, bukan tiga.** Nihongo Flow punya 3 implementasi SM-2 terpisah
   (`AnkiProgress`, `KanjiTamagoProgress`, `KatsuyouReviewCard`) yang tidak saling tahu.
   Hibi punya satu engine, satu antrean "review hari ini".
2. **Feedback loop nyata.** Kakou saat ini cuma menampilkan prompt lalu menyuruh user
   copy-paste ke AI lain. Hibi menutup loop itu di dalam app.
3. **Selamatkan data Anki.** Progress SRS dan deck hasil import `.apkg` dipertahankan penuh.

Semua fitur lain dari Nihongo Flow (Prep, Kotoba, JLPT, Achievement, Story, Bookmark,
Highlight, Kana) **tidak dibawa**. Bisa ditambah nanti kalau memang dipakai.

**Bunpou dan Katsuyou adalah kasus khusus.** Modulnya tidak dibawa, tapi **datanya
dipanen**: 114 pola N5 dari Bunpou, 53 pola dari Katsuyou, dan 142 verba dengan
konjugasi lengkap. Semuanya jadi bank grammar untuk Kakou dan halaman Library. Jadi
referensi tata bahasa tetap ada tanpa membangun dua modul terpisah. Lihat 7.2 dan 7.2b.

---

## 2. Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 16 (App Router, RSC default) | Sama dengan project lama, tidak ada biaya belajar |
| Bahasa | TypeScript strict | - |
| Styling | Tailwind CSS v4 | via `@tailwindcss/postcss` |
| Komponen | shadcn/ui + blok pilihan dari 21st.dev | Kode masuk ke repo, bukan dependency |
| Ikon | `@phosphor-icons/react` (satu family) | taste-skill melarang lucide sebagai default |
| Animasi | `motion/react` | GSAP hanya kalau butuh scroll-pin di landing |
| Database | PostgreSQL yang sama dengan Nihongo Flow | Nol migrasi data lintas server |
| ORM | Prisma 7 | - |
| SRS | `ts-fsrs` | FSRS lebih akurat dari SM-2, dan sudah teruji di Anki upstream |
| Auth | JWT via `jose` + `bcryptjs` | Cukup untuk app personal, tidak menambah permukaan baru |
| AI | `@google/genai` (Gemini) | Sudah ada key, dipakai untuk Kakou review + Conversation + mnemonic |
| Runtime | Bun 1.3.13 | Terdeteksi di mesin, sama dengan project lama |

**Catatan ikon:** shadcn CLI meng-generate beberapa komponen dengan import `lucide-react`
(Dialog, Select, Checkbox). Setelah `shadcn add`, import itu diganti ke Phosphor. Sekali kerja,
sekitar 5 file, supaya aturan "satu family ikon per project" benar-benar dipatuhi.

**Tidak dipakai:**

- **HeroUI.** Nihongo Flow memakai `@heroui/react` v3, Hibi tidak. shadcn/ui adalah satu
  satunya design system untuk app surfaces. Aturan taste-skill 2.A: satu sistem per project,
  tidak boleh dicampur. Jadi tidak ada `@heroui/*` di `package.json`.
- **`lucide-react`** sebagai family utama, lihat catatan ikon di atas.
- Library komponen lain apa pun yang tumpang tindih peran dengan shadcn/ui.

---

## 3. Design direction (taste-skill)

Skill yang dipakai: **`design-taste-frontend`** (taste-skill v2) dari `tasteskill.dev`,
dipasang sebagai skill lokal di `.kiro/skills/design-taste-frontend/`.

### Catatan kejujuran soal cakupan skill

Section 13 SKILL.md menyatakan skill ini **bukan** untuk "dashboards / dense product UI /
multi-step forms". Sebagian besar Hibi justru product UI. Jadi skill dipakai terbelah:

| Permukaan | Perlakuan |
|---|---|
| Landing, halaman auth, halaman about | taste-skill penuh, termasuk vocabulary blok Section 10 |
| App surfaces (review, sesi tulis, kanji, percakapan) | shadcn/ui sebagai design system + **disiplin anti-slop** taste-skill: satu accent, satu radius scale, satu tema, motion yang termotivasi, larangan AI tells, cek kontras WCAG AA, larangan em-dash |

Ini bukan mengabaikan skill. Section 2.A skill itu sendiri menunjuk shadcn/ui sebagai
foundation yang benar untuk "modern SaaS where you own the components", dan Section 13
menyuruh menyatakan secara eksplisit kalau brief-nya product UI. Itu yang dilakukan di sini.

### Design read

> Reading this as: **personal daily-practice study tool for a single serious learner**,
> with a **calm editorial product** language, leaning toward **shadcn/ui + Tailwind v4 +
> Geist + restrained motion**.

### Dial

| Permukaan | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY |
|---|---|---|---|
| Landing / marketing | 8 | 6 | 3 |
| App shell & dashboard | 5 | 4 | 5 |
| Sesi fokus (review, tulis) | 3 | 3 | 3 |

Sesi fokus sengaja paling rendah. Saat user sedang me-review kartu, layout yang
asimetris dan animasi yang ramai adalah gangguan, bukan nilai tambah.

### Token yang dikunci di awal

- **Tema:** dual-mode (light + dark), default ikut `prefers-color-scheme`, ada toggle manual.
- **Accent:** satu warna, dipakai identik di seluruh app. Kandidat: deep teal atau burnt
  orange. Bukan ungu (larangan LILA RULE), bukan beige+brass.
- **Radius:** satu skala. Rencana: `12px` untuk card/panel, `full` untuk kontrol interaktif,
  `8px` untuk input. Aturan ini didokumentasikan dan dipatuhi di semua komponen.
- **Font:** `Geist` + `Geist Mono` via `next/font`. Untuk teks Jepang: `Noto Sans JP`
  di-subset. Tanpa serif.
- **Warna semantik grading** (Again/Hard/Good/Easy) dianggap **status semantik**, bukan
  accent kedua. Ini pengecualian sah dari aturan satu-accent dan dicatat di
  `docs/design-tokens.md`.

### Sumber komponen

- **shadcn/ui** untuk primitif: button, card, dialog, drawer, tabs, select, progress,
  tooltip, sonner, skeleton, form.
- **21st.dev** untuk blok yang mahal dibuat tangan: hero landing, AI chat shell untuk
  Conversation, card stack / carousel untuk galeri kanji, heatmap-style grid.
  Format registry shadcn, jadi masuk lewat `npx shadcn@latest add <url>`.
  Perlu diingat: akun gratis 21st.dev dibatasi 2 copy komponen per hari.

---

## 4. Struktur folder

```
hibi/
├── app/
│   ├── (app)/                    # app shell, butuh auth
│   │   ├── today/                # antrean review terpadu + checklist harian
│   │   ├── anki/
│   │   ├── kakou/
│   │   ├── kanji/                # Kanji Tamago
│   │   └── talk/                 # AI Conversation
│   ├── api/
│   │   ├── ai/                   # proxy Gemini, key tidak pernah keluar server
│   │   └── media/
│   ├── login/ dan register/
│   └── layout.tsx
├── features/
│   ├── srs/                      # engine FSRS terpadu, dipakai semua fitur
│   ├── anki/
│   ├── kakou/
│   ├── kanji/
│   ├── talk/
│   └── timer/
├── components/ui/                # shadcn + blok 21st.dev
├── lib/                          # db, session, env, ai client
├── prisma/schema.prisma          # sumber model Prisma
├── db/migrations/                # SQL Hibi, histori terpisah dari Nihongo Flow
├── scripts/
│   ├── db-migrate.ts             # migrator dengan ledger hibi_schema_migration
│   ├── etl-anki.ts               # migrasi data Anki dari tabel lama
│   └── seed-kanji.ts
├── docs/
│   ├── design-tokens.md
│   └── srs.md
├── .kiro/skills/design-taste-frontend/
└── PLAN.md
```

Aturan ukuran file: **tidak ada komponen di atas 250 baris.** Ini reaksi langsung terhadap
`AnkiContent.tsx` (1986 baris) dan `KanjiTamagoContent.tsx` (1760 baris) di project lama.

---

## 5. Schema database

Tabel baru, **prefix `hibi_`**, hidup berdampingan di database yang sama dengan tabel
Nihongo Flow. Nihongo Flow tetap jalan tanpa perubahan selama transisi. Tidak ada
`migrate reset`, `prisma db push`, atau drop tabel lama.

Kedua project tidak boleh berbagi histori `_prisma_migrations`. Hibi memakai SQL aditif
di `db/migrations/` dan ledger sendiri bernama `hibi_schema_migration`, dijalankan lewat
`bun run db:migrate`. Runner memakai advisory lock, transaksi per file, dan checksum
SHA-256 supaya migrasi yang sudah diterapkan tidak dapat diubah diam-diam.

### Inti: satu SRS untuk semua

```prisma
enum ReviewItemKind {
  VOCAB          // kartu Anki
  KANJI          // Kanji Tamago
  GRAMMAR        // pola tata bahasa Kakou yang perlu diulang
}

model ReviewItem {
  id        String         @id @default(cuid())
  kind      ReviewItemKind
  // payload spesifik per kind, di-normalisasi lewat relasi di bawah
  vocab     VocabCard?     @relation(fields: [vocabId], references: [id])
  vocabId   String?
  kanji     KanjiEntry?    @relation(fields: [kanjiId], references: [id])
  kanjiId   String?
  grammar   GrammarPoint?  @relation(fields: [grammarId], references: [id])
  grammarId String?
  states    ReviewState[]
  @@index([kind])
}

model ReviewState {
  id             String   @id @default(cuid())
  userId         String
  itemId         String
  item           ReviewItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  direction      String   @default("RECOGNIZE") // RECOGNIZE | RECALL (tulis kanji)

  // field FSRS
  stability      Float    @default(0)
  difficulty     Float    @default(0)
  state          Int      @default(0)  // 0 New, 1 Learning, 2 Review, 3 Relearning
  reps           Int      @default(0)
  lapses         Int      @default(0)
  scheduledDays  Int      @default(0)
  elapsedDays    Int      @default(0)
  lastReviewedAt DateTime?
  dueAt          DateTime @default(now())

  logs           ReviewLog[]
  @@unique([userId, itemId, direction])
  @@index([userId, dueAt])
}

model ReviewLog {
  id         String   @id @default(cuid())
  stateId    String
  state      ReviewState @relation(fields: [stateId], references: [id], onDelete: Cascade)
  rating     Int      // 1..4
  elapsedMs  Int?     // waktu berpikir, untuk analitik
  reviewedAt DateTime @default(now())
  @@index([stateId, reviewedAt])
}
```

Tiga hal yang berubah secara fundamental dari project lama:

1. **`ReviewState` dikunci ke `itemId` (cuid), bukan ke isi kartu.** Project lama memakai
   `cardKey = "Bab 1-0-食べる-たべる"`. Kalau typo kanji diperbaiki, progress jadi orphan
   tanpa error. Masalah ini hilang.
2. **`direction` masuk ke unique key.** Mode "baca kanji" dan "tulis kanji" adalah dua
   jadwal terpisah untuk item yang sama. Project lama mencampur keduanya.
3. **`ReviewLog` ada.** Project lama tidak menyimpan riwayat review, jadi tidak mungkin
   melatih parameter FSRS atau menganalisis kanji apa yang paling sering gagal.

### Tabel konten

```prisma
model VocabCard {
  id            String  @id @default(cuid())
  legacyAnkiId  String? @unique   // AnkiCard.id lama = Note ID asli dari Anki
  deck          String
  term          String            // kanji / kata
  reading       String
  meaning       String
  audioFile     String?
  imageFile     String?
  sentence      String?           // sudah disanitasi saat ETL, bukan saat render
  sentenceReading String?
  sentenceMeaning String?
  sentenceAudio String?
  items         ReviewItem[]
  @@index([deck])
}

model KanjiEntry {
  id         String  @id @default(cuid())
  chapter    String
  topic      String
  category   String   // teishutsu_kanji | yomeru | mite_wakaru
  character  String
  readings    String
  meaning    String
  examples   Json?
  radicals   Json?    // baru: dekomposisi komponen
  strokeSvg  String?  // baru: path KanjiVG untuk animasi urutan guratan
  items      ReviewItem[]
  @@unique([chapter, category, character])
}
```

### Sesi Kakou

```prisma
model WritingSession {
  id         String   @id @default(cuid())
  userId     String
  mode       String
  level      String
  durationMinutes Int
  prompts    Json     // snapshot
  progress   Int      @default(0)
  status     String   @default("ACTIVE")
  selfRating String?
  reviews    WritingReview[]   // baru
  startedAt  DateTime @default(now())
  completedAt DateTime?
}

model WritingReview {
  id           String   @id @default(cuid())
  sessionId    String
  session      WritingSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  imageKey     String?  // foto tulisan tangan
  transcript   String?  @db.Text
  corrections  Json     // [{ span, issue, suggestion, category }]
  scores       Json     // { accuracy, complexity, naturalness }
  createdAt    DateTime @default(now())
}

model Weakness {
  id        String   @id @default(cuid())
  userId    String
  category  String   // "particle-wo", "te-form", "counter", dst
  hits      Int      @default(1)
  lastSeen  DateTime @default(now())
  @@unique([userId, category])
}
```

`WritingReview` + `Weakness` adalah feedback loop yang tidak ada di Nihongo Flow.
Hasil koreksi AI dipakai untuk memilih prompt berikutnya.

### Transkrip percakapan

```prisma
model TalkSession {
  id        String   @id @default(cuid())
  userId    String
  scenario  String
  level     String   // N5 | N4 | N3
  turns     Json     // [{ role, text, at }]
  summary   Json?    // kosakata baru, koreksi, skor
  startedAt DateTime @default(now())
  endedAt   DateTime?
}
```

Nihongo Flow punya model `ChatMessage` tapi fitur conversation tidak pernah memakainya.
Semua transkrip hilang saat refresh.

---

## 6. Strategi data: apa yang diselamatkan

### Sebelum apa pun: backup

```bash
pg_dump "$DATABASE_URL_VPS" -Fc -f nihongo-flow-backup-YYYYMMDD.dump
# arsip 4353 file media
tar -czf anki-media-YYYYMMDD.tar.gz public/anki-media
```
Disimpan **di luar** kedua repo. Ini yang membuat semua langkah berikutnya reversible.

### Yang dibawa

| Sumber lama | Tujuan baru | Cara |
|---|---|---|
| `AnkiCard` (deck import `.apkg`) | `VocabCard` (`legacyAnkiId` = `AnkiCard.id`) | ETL, 1:1 |
| `AnkiProgress` dengan `cardKey = custom-<id>` | `ReviewState` via `legacyAnkiId` | ETL, aman |
| `AnkiProgress` dengan `cardKey = Bab X-Y-kanji-hiragana` | `VocabCard` + `ReviewState` | ETL, perlu resolve (lihat catatan) |
| `public/anki-media/` (4353 file) | `public/anki-media/` di Hibi | copy langsung |
| `KanjiTamago` + `examples` | `KanjiEntry` | ETL |
| `KanjiTamagoProgress` | `ReviewState` (kind KANJI) | ETL |
| `bunpouData.ts` (114 pola N5) | `GrammarPoint` (`provenance: bunpou`) | ETL + transformasi field, lihat 7.2.3 |
| `conjugationGuides.ts` (53 pola, blok `mistake`) | `GrammarPoint` (`provenance: katsuyou`) | ETL + transformasi field |
| `verbs.ts` (142 verba, 13 bentuk) | tabel referensi verba | ETL, `romaji` dibuang |
| `User` | `User` | ETL, hash bcrypt dibawa apa adanya |

**Catatan resolve `cardKey` Prep:** progress untuk deck "Dekiru Nihongo N5" dikunci ke
posisi kata di dalam struktur `PrepData` (`Bab {chapter}-{sectionIndex}-{kanji}-{hiragana}`).
Karena Hibi tidak membawa fitur Prep, kata-kata ini di-promosikan menjadi `VocabCard`
tersendiri dengan deck `"Dekiru Nihongo N5"`, dicocokkan lewat pasangan kanji+hiragana.
Baris yang gagal dicocokkan **tidak dibuang secara diam-diam**, tapi ditulis ke
`etl-unmatched.json` untuk diperiksa manual.

### Konversi SM-2 ke FSRS

Data lama hanya punya `interval`, `ease`, `repetitions`, `dueDate`. FSRS butuh
`stability` dan `difficulty`. Tidak ada konversi yang eksak, jadi dipakai pendekatan
konservatif dan didokumentasikan di `docs/srs.md`:

- `stability` ← `interval` (interval hari dianggap proxy stabilitas awal)
- `difficulty` ← dipetakan linear dari `ease` (2.5 → sekitar 5.0 di skala FSRS 1..10, ease
  rendah berarti difficulty tinggi)
- `state` ← `repetitions === 0 ? Learning : Review`
- `dueAt` ← `dueDate` apa adanya, jadi tidak ada kartu yang tiba-tiba jatuh tempo

FSRS akan mengoreksi sendiri setelah beberapa review. Yang penting: **tidak ada kartu
yang reset ke nol** dan tidak ada yang tiba-tiba menumpuk jadi due.

### Yang tidak dibawa

- Tabel yang belum diverifikasi terpakai: `Story`, `Bookmark`, `Highlight`, `KanaProgress`,
  `JLPTQuestion`, `JLPTAttempt`, `Achievement`, `UserAchievement`, `LearningProgress`,
  `KanjiDictionary`, `ChatMessage`. Sebelum diputuskan mati, dijalankan skrip hitung baris.

Aset VRM/GLB **dibawa** (keputusan: avatar 3D dipertahankan), tapi melalui langkah
kompresi lebih dulu. Lihat bagian 7.4.

---

## 7. Rencana per fitur

### 7.1 Anki

**Kondisi lama:** `AnkiContent.tsx` 1986 baris, 30+ `useState`. Algoritma SM-2 ditulis
duplikat di `api/anki/route.ts` baris 63-89 dan 118-144. Batch save memanggil N `upsert`
di dalam satu transaksi. `dangerouslySetInnerHTML` untuk contoh kalimat tanpa sanitasi.
Quick mode ikut menulis rating ke SRS sehingga `ease` turun terus. Tidak ada timezone.
Kalau tab ditutup di tengah sesi mode "session", semua `pendingReviews` hilang.

**Target Hibi:**
- FSRS lewat `ts-fsrs`, satu fungsi murni `schedule(state, rating, now)` di `features/srs/`,
  bisa di-unit-test, dipakai semua fitur.
- Dipecah: `Flashcard`, `GradingBar`, `WritingPanel`, `DeckPicker`, `SessionSummary`,
  `KanjiGallery`. Masing-masing di bawah 250 baris.
- Server Action `submitReview`, bukan `fetch` manual. Optimistic update di client.
- Antrean review disimpan di IndexedDB, di-flush pada `visibilitychange` dan
  `beforeunload`. Tidak ada progress yang hilang karena tab ditutup.
- Bulk upsert satu statement `INSERT ... ON CONFLICT DO UPDATE`, bukan N round-trip.
- HTML disanitasi **saat ETL**, sekali, bukan setiap render. Field `sentence` menyimpan
  teks bersih.
- `dueAt` dihitung dari batas tengah malam **zona waktu user**, disimpan di profil.
- Quick mode tidak menyentuh jadwal FSRS. Dia mode latihan terpisah.
- Flashcard bisa di-flip dengan keyboard (`role="button"`, `tabIndex`, `onKeyDown`),
  setiap tombol grading punya `aria-label` yang menjelaskan konsekuensinya.

### 7.2 Kakou (fitur dengan improve paling besar)

**Kondisi lama:** arsitektur sudah bersih, tapi nilainya dibatasi 48 prompt statis di
`prompts.ts`. Self-rating `EASY/OKAY/DIFFICULT` disimpan tapi **tidak pernah dibaca lagi**.
Review AI dilakukan dengan cara user copy prompt ke clipboard, buka tab lain, paste,
upload foto manual, baca hasil sendiri. Tidak ada apa pun yang kembali ke app.

#### 7.2.1 Review bertingkat, tahan kuota habis

AI bukan syarat. Tiga tingkat, turun otomatis saat kuota habis, dan bisa dipilih manual
lewat toggle "hemat token":

| Tingkat | Cara kerja | Butuh AI? |
|---|---|---|
| **1. Otomatis** | Upload foto tulisan tangan, Gemini multimodal mengembalikan transkrip + koreksi terstruktur + skor rubrik | Ya |
| **2. Semi-manual** | App menyusun prompt lengkap, user copy ke AI eksternal, hasilnya di-**paste balik** ke app, di-parse, disimpan seperti tingkat 1 | Tidak (AI di luar app) |
| **3. Tanpa AI** | Pengecekan mekanis terhadap `expectedForms` + checklist self-review dari `commonMistakes` | Tidak |

**Kotak paste-back adalah bagian yang tidak boleh dilewatkan.** Tanpa itu, tingkat 2
mengulangi cacat Kakou lama: koreksi bagus didapat di tab lain lalu hilang, tabel
`Weakness` tidak pernah terisi, dan prompt adaptif mati saat token habis.

Mekanismenya: prompt yang di-copy memerintahkan AI eksternal menjawab dalam blok JSON
berformat tetap. Paste-back cukup `JSON.parse` + validasi Zod, lalu masuk ke
`WritingReview` dan `Weakness` melalui jalur yang sama dengan tingkat 1. Kalau parse
gagal, teks mentah tetap disimpan sebagai catatan, tidak dibuang.

Tingkat 3 memberi umpan balik objektif tanpa AI sama sekali: apakah tulisan mengandung
bentuk た, apakah partikel を muncul, apakah panjang minimal terpenuhi. Semua dicek
dengan pencocokan pola terhadap field `expectedForms`.

#### 7.2.2 Bank prompt: statis dan bisa di-review, bukan generate runtime

Keputusan: **tidak ada AI yang meng-generate prompt saat runtime.** Bank disusun sekali,
masuk git, bisa diperiksa.

Alasannya bukan sekadar hemat token. Konten statis bisa di-review sebelum sampai ke user.
Aplikasi belajar yang mengajarkan tata bahasa salah lebih buruk daripada aplikasi dengan
prompt sedikit, dan nondeterminisme di jalur konten adalah risiko, bukan fitur.

**Sumber bahan (inventaris terverifikasi dari Nihongo Flow):**

| Sumber | Isi | Distribusi JLPT |
|---|---|---|
| `bunpouData.ts` | 15 bab, 114 pola, 342 contoh | N5: 114 (seluruhnya) |
| `conjugationGuides.ts` | 14 bentuk konjugasi, 53 pola, blok `mistake` | N5: 28, N4: 17, N3: 7, N2: 1 |
| `verbs.ts` | 142 verba, 13 bentuk konjugasi lengkap | N5: 82, N4: 33, N3: 21, N2: 6 |
| `conjugationExamples.ts` | contoh kalimat per bentuk + `highlight` | - |

Total pola yang tersedia: **N5 = 142, N4 = 17, N3 = 7.** N5 penuh, N4 tipis, N3 hampir kosong.

**Kekurangan N4 dan N3 ditulis manual saat pengembangan**, bukan di-generate saat runtime.
Perkiraan realistis: N4 sekitar 80-100 pola, N3 sekitar 100-130 pola. Dikerjakan bertema
per batch. **N4 diselesaikan lebih dulu**; N3 menyusul dan tidak memblokir fase Kakou.

**Jejak asal-usul wajib.** Konten yang ditulis saat pengembangan perlu diverifikasi, jadi
setiap entri membawa:

```ts
provenance: "bunpou" | "katsuyou" | "authored"
verified: boolean   // default false untuk "authored"
```

Entri `authored` disimpan di file terpisah supaya mudah di-review. Ada skrip validasi
yang memeriksa skema, konsistensi kana, field wajib, dan duplikat.

#### 7.2.3 Bentuk field: transformasi, bukan copy

Bunpou dan Katsuyou adalah **referensi untuk dibaca**. Kakou adalah **latihan untuk
diproduksi**. 114 pola referensi tidak otomatis menjadi 114 prompt menulis yang baik.

**Dibuang dari format lama:**

- `romaji` - untuk latihan menulis N4/N3 ini penopang yang merusak. Di `verbs.ts` bobotnya
  13 bentuk × 142 verba.
- `descEn`, `exampleEn` - satu bahasa penjelasan saja, Indonesia. Dua deskripsi paralel
  pasti melenceng seiring waktu.

**Dipertahankan:** `pattern`, kana reading (untuk furigana), contoh kalimat Jepang,
arti Indonesia, blok `mistake` dari Katsuyou.

**Ditambahkan, tidak ada padanannya di data lama:**

| Field | Fungsi |
|---|---|
| `writingTask` | Instruksi latihan sebenarnya, bukan deskripsi pola |
| `frame` | Kerangka kalimat yang diisi, mis. `___は___より___です` |
| `constraints` | "minimal 2 kalimat", "wajib bentuk lampau" |
| `expectedForms` | Bentuk/partikel yang harus muncul, untuk pengecekan mekanis tingkat 3 |
| `weaknessTags` | Penghubung ke tabel `Weakness`, membuat prompt adaptif berfungsi |
| `commonMistakes` | Diperluas per pola. Dipakai dua kali: bahan prompt review AI, dan checklist self-review |

```prisma
model GrammarPoint {
  id            String   @id @default(cuid())
  level         String   // N5 | N4 | N3
  chapter       Int?     // asal bab Bunpou, kalau ada
  pattern       String
  meaningId     String   @db.Text
  frame         String?
  writingTask   String   @db.Text
  constraints   Json?    // string[]
  expectedForms Json?    // [{ kind, match, label }]
  weaknessTags  Json     // string[]
  commonMistakes Json?   // [{ bad, good, noteId }]
  examples      Json     // [{ jp, kana, meaningId, highlight }]
  provenance    String   // bunpou | katsuyou | authored
  verified      Boolean  @default(false)
  items         ReviewItem[]
  @@index([level])
}
```

#### 7.2.4 Urutan improve lainnya

1. Prompt adaptif berbasis `Weakness` (bukan sekadar menghindari 12 sesi terakhir)
2. Mode "Vocabulary Reinforcement": ambil 3-5 kata yang sedang due di SRS, minta user
   menulis kalimat memakainya. Ini yang mengikat Kakou dan Anki jadi satu sistem
3. Skor rubrik: accuracy, complexity, naturalness, ditampilkan sebagai tren
4. Canvas di layar (`perfect-freehand`) sebagai alternatif saat tidak pegang buku
5. SRS untuk pola yang sulit, lewat engine FSRS yang sama
   (`ReviewItemKind.GRAMMAR`)
6. Heatmap kalender
7. Export worksheet PDF dengan grid genkōyōshi (原稿用紙)
8. Mode diktasi audio

### 7.2b Library: daftar yang dipelajari

Halaman daftar semua `GrammarPoint` dengan status per pola, ditarik dari `ReviewState`:
belum disentuh / sedang dilatih / sudah dikuasai / bermasalah.

Ini bukan halaman tambahan, ini tulang punggung. Fungsinya berlapis:

- **Peta cakupan** per level: "N5 142/142, N4 23/94"
- **Pintu masuk dua arah.** Dari daftar bisa memulai sesi terfokus pada satu pola; dari
  dalam sesi bisa membuka referensinya. Kakou lama sudah setengah punya ini lewat query
  param `?source=bunpou&sourceId=xxx`, tapi tidak ada halaman daftar untuk memulainya
- **Tempat `Weakness` menjadi terlihat.** Tanpa halaman ini, `Weakness` hanya mesin tak
  terlihat. Dengan halaman ini user bisa melihat "partikel を adalah titik terlemah" dan
  langsung melatihnya
- **Pengganti modul Bunpou dan Katsuyou** yang tidak dibawa. Referensi tata bahasa kembali
  tanpa membangun modul terpisah

Dikerjakan di fase yang sama dengan Kakou, bukan sesudahnya.

### 7.3 Kanji Tamago

**Kondisi lama:** `KanjiTamagoContent.tsx` 1760 baris. 130 baris data confusion pair
hardcoded di dalam komponen (baris 47-176). API mengirim **seluruh** daftar kanji dan
seluruh progress tanpa pagination. Endpoint bernama `/mnemonic` padahal tidak memanggil
AI sama sekali, hanya menyimpan teks yang diketik user. Activity dicatat dengan tipe
`"anki_review"` sehingga statistik dashboard menyesatkan. Animasi urutan guratan hanya
muncul **setelah** user salah. Shuffle memakai `sort(() => Math.random() - 0.5)` yang
distribusinya bias.

**Target Hibi:**
- SRS pakai engine terpadu. Tidak ada SM-2 kedua.
- **Stroke order proaktif** dari KanjiVG, bisa dipanggil kapan saja sebagai alat belajar,
  bukan hukuman setelah salah.
- **Dekomposisi radikal** (field `radicals`, sumber KRADFILE atau IDS). Ini yang paling
  membantu mengurangi kebingungan antar kanji yang mirip, jauh lebih baik daripada
  daftar confusion pair hardcoded.
- **Mnemonic AI yang di-cache di DB**, dibangun dari komponen radikal, tetap bisa
  di-override user. Nama endpoint jadi jujur.
- Tiga mode kuis: recognition (kanji → arti), recall (arti → tulis kanji), reading
  (kanji dalam kalimat → bacaan).
- Query hanya mengambil kartu yang due, difilter di server.
- Fisher-Yates untuk shuffle.
- Activity type sendiri: `kanji_review`.

### 7.4 AI Conversation

**Kondisi lama, masalah keamanan lebih dulu:**
`app/api/live/session/route.ts:17` mengembalikan `process.env.GEMINI_API_KEY` mentah ke
client, lalu `conversation/page.tsx:175` memasangnya sebagai query param di URL WebSocket.
Endpoint punya auth check, jadi hanya user login yang bisa mengambilnya, tapi setelah
key ada di browser tidak ada batas apa pun. Key juga ikut tercatat di history browser dan
log proxy. Tidak ada rate limiting. **Rekomendasi: rotate key itu.**

Masalah lain: 68 MB aset VRM tanpa kompresi maupun indikator progres (14-30 MB download
sebelum avatar muncul, sekitar 24-48 detik di 4G). `ScriptProcessorNode` sudah deprecated.
Tidak ada retry saat WebSocket putus. Transkrip tidak pernah disimpan. Level di-hardcode
N5. `getUserMedia` tidak menangani `NotAllowedError`, jadi user yang menolak izin mic
hanya melihat "Unknown error". Context compression agresif (`triggerTokens: 6400`)
membuat AI cepat lupa.

**Target Hibi:**
- **Key tidak pernah meninggalkan server.** Dua opsi, diputuskan saat implementasi:
  ephemeral token kalau Gemini Live sudah mendukungnya untuk jalur ini, atau WebSocket
  relay di server Next.js. Relay lebih pasti aman dan sekaligus memberi tempat untuk
  rate limiting per user.
- **Avatar 3D dipertahankan, tapi dioptimalkan.** Avatar VRM adalah bagian dari pengalaman
  yang ingin dijaga, jadi tidak diganti 2D. Yang diperbaiki adalah cara memuatnya:
  kompresi mesh (Draco atau meshopt) untuk menurunkan 68 MB secara signifikan, progress
  bar dengan persentase nyata saat download, avatar default yang paling kecil dipilih
  lebih dulu, dan `Cache-Control` panjang supaya kunjungan kedua instan. Lip-sync tetap
  berbasis `AnalyserNode` seperti sekarang, tapi bisa ditingkatkan ke viseme kalau
  amplitude terasa kurang meyakinkan.
- **Transkrip disimpan** ke `TalkSession`, lengkap dengan ringkasan pasca-sesi: kosakata
  baru, koreksi grammar, skor kelancaran.
- **Level N5/N4/N3** sebagai kontrol eksplisit yang mengubah system prompt.
- **Skenario roleplay bertahap** (contoh: reservasi hotel → check-in → keluhan → check-out),
  bukan hanya daftar topik.
- **Injeksi kosakata yang sedang di-SRS** ke system prompt, supaya AI sengaja memakai
  kata yang sedang dipelajari user. Kata yang berhasil dipakai user memberi sinyal
  tambahan ke `ReviewState`.
- `AudioWorkletNode` menggantikan `ScriptProcessorNode`.
- Reconnect dengan exponential backoff, dan penanganan error mic yang spesifik
  (`NotAllowedError`, `NotFoundError`).

---

### 7.5 Study timer global

Timer belajar hadir di **semua halaman app**, bukan milik satu fitur. User tinggal menekan
satu tombol untuk mulai atau berhenti, misalnya saat beralih ke istirahat.

**Yang dibawa dari Nihongo Flow:** pola `accumulatedSeconds` + `lastStartedAt`. Ini pola
yang benar karena server yang berwenang, bukan client. Waktu berjalan dihitung sebagai
`accumulated + (now - lastStartedAt)` hanya saat status `RUNNING`. Konsekuensinya: refresh
halaman tidak menghilangkan hitungan, dan dua tab tidak saling menimpa.

**Yang dilepas:** kopling ke Kakou. Model lama punya `kakouSessionId` sebagai FK unik dan
`source` yang default `"KAKOU"`, jadi timer secara struktural adalah milik Kakou. Di Hibi
timer berdiri sendiri dan hanya *mencatat* konteks.

```prisma
model StudyTimer {
  id                 String    @id @default(cuid())
  userId             String
  status             String    @default("RUNNING") // RUNNING | PAUSED | ENDED
  context            String?   // anki | kakou | kanji | talk | null
  accumulatedSeconds Int       @default(0)
  lastStartedAt      DateTime?
  startedAt          DateTime  @default(now())
  endedAt            DateTime?
  @@index([userId, startedAt])
  @@index([userId, status])
}
```

`context` sengaja string bebas, bukan relasi. Tujuannya menjawab "tadi saya belajar apa"
tanpa membuat timer bergantung pada tabel fitur mana pun.

**Perilaku UI:**

| Kondisi | Tampilan |
|---|---|
| Idle | Pil kecil di app shell, satu tombol "Mulai" |
| Berjalan | Pil menampilkan waktu berjalan + tombol pause dan stop |
| Menciut otomatis | Setelah beberapa saat tanpa interaksi saat berjalan, pil menyusut jadi tab tipis di tepi layar |
| Tersembunyi | Tombol kecil di tepi untuk memunculkan kembali |

Animasi menciut memakai `layout` dan `layoutId` dari `motion/react`, bukan animasi
`width`/`height` (aturan 6.A taste-skill: hanya `transform` dan `opacity`). Preferensi
ciut/lebar disimpan di `localStorage` supaya pilihan user bertahan. Di bawah
`prefers-reduced-motion` transisinya langsung tanpa gerak.

Timer termasuk **fase 0** karena bagian dari app shell, bukan fitur tambahan.

Catatan timezone: `lib/timer.ts` lama menetapkan offset JST (+9) secara hardcoded. Di Hibi
offset diambil dari profil user, dengan JST sebagai default.

---

## 8. Roadmap

| Fase | Isi | Selesai berarti |
|---|---|---|
| **0. Fondasi - selesai** | Next.js 16.2.12 + Tailwind v4 + shadcn, taste-skill, design token, auth, app shell, tema light/dark, **study timer global** | Build hijau; 6 unit test lulus; schema smoke test lulus; timer hadir di semua halaman dan tahan refresh |
| **1. Data** | Backup + `pg_dump`, skrip hitung baris tabel lama, schema Prisma baru, `scripts/etl-anki.ts`, copy `anki-media` | Semua `AnkiProgress` termigrasi, `etl-unmatched.json` diperiksa, jumlah kartu due sebelum dan sesudah cocok |
| **2. SRS + Anki** | Engine FSRS + unit test, halaman `/today`, sesi review Anki lengkap dengan mode tulis | Bisa review satu sesi penuh, progress tersimpan, tab ditutup tidak menghilangkan data |
| **3. Kanji Tamago** | ETL kanji, stroke order KanjiVG, radikal, 3 mode kuis, mnemonic AI ter-cache | Satu bab bisa diselesaikan end-to-end |
| **4a. Bank grammar** | ETL Bunpou (114 N5) + Katsuyou (53) ke `GrammarPoint` dengan field baru, tulis manual pola N4 yang kurang, skrip validasi | N5 lengkap, N4 mencapai 80+ pola, skrip validasi hijau, `provenance` terisi benar |
| **4b. Kakou + Library** | Sesi tulis, review 3 tingkat (otomatis / paste-back / mekanis), `Weakness`, prompt adaptif, mode vocabulary reinforcement, halaman library dengan status per pola | Foto menghasilkan koreksi tersimpan; kuota habis tidak mematahkan sesi; library menampilkan cakupan per level |
| **5. Talk** | Relay WebSocket aman, avatar VRM dikompresi + progress bar, transkrip, level, skenario | Percakapan jalan tanpa key di client, transkrip tersimpan, avatar termuat dengan progres yang terlihat |
| **6. Landing + polish** | Landing page dengan taste-skill penuh, PWA, Lighthouse | Pre-flight check taste-skill lolos semua kotak |

Setiap fase diakhiri dengan `bun run build` dan test yang relevan. Tidak lanjut ke fase
berikutnya sebelum fase sekarang hijau.

---

## 9. Isolasi dari repo Nihongo Flow

`hibi/` berada di dalam working tree repo `nihongo-flow`, jadi harus diabaikan secara
eksplisit. Ditambahkan ke `.gitignore` Nihongo Flow:

```
# Project terpisah, punya repo sendiri
/hibi/
```

Hibi nanti di-`git init` sendiri. Konsekuensi yang perlu diketahui: git tidak akan pernah
melihat isi `hibi/`, jadi `git clean -fdx` di Nihongo Flow **tidak** akan menghapusnya
(file yang di-ignore butuh `-x`, dan itu justru akan menghapusnya). Perintah itu tidak
akan dijalankan tanpa persetujuan.

Alternatif yang lebih bersih kalau nanti terasa mengganggu: pindahkan ke
`D:\Projects\hibi` sebagai folder sejajar, sehingga tidak ada nested repo sama sekali.

---

## 10. Risiko

| Risiko | Mitigasi |
|---|---|
| ETL salah memetakan progress Anki | `pg_dump` sebelum mulai. ETL idempoten, bisa dijalankan ulang. Verifikasi: jumlah kartu due sebelum vs sesudah harus sama |
| Konversi SM-2 → FSRS membuat jadwal melompat | `dueAt` dibawa apa adanya, tidak dihitung ulang. FSRS baru mengambil alih pada review berikutnya |
| `cardKey` deck Dekiru tidak bisa di-resolve | Ditulis ke `etl-unmatched.json`, tidak dibuang diam-diam |
| Kuota 21st.dev (2 komponen per hari, akun gratis) | Daftar komponen yang dibutuhkan disusun lebih dulu, diambil bertahap sesuai fase |
| Gemini Live belum mendukung ephemeral token untuk jalur ini | Fallback ke WebSocket relay di server. Key tetap tidak pernah ke client |
| taste-skill sebagian out of scope untuk product UI | Sudah dipisah eksplisit di bagian 3. shadcn/ui jadi design system untuk app surfaces |
| Konten grammar N4/N3 yang ditulis manual mengandung kesalahan | `provenance: authored` + `verified: false` sebagai default, file terpisah supaya mudah di-review, skrip validasi skema dan konsistensi kana. N4 dituntaskan lebih dulu, N3 tidak memblokir fase mana pun |
| Kuota Gemini habis di tengah pemakaian | Review Kakou bertingkat: paste-back manual, lalu pengecekan mekanis. Toggle "hemat token" supaya bisa dipilih sadar. Tidak ada fitur inti yang mati |
| Nested git repo membingungkan tooling | `/hibi/` di-ignore. Opsi pindah ke folder sejajar tetap terbuka |

---

## 11. Peran AI di Hibi

AI dipakai lebih luas daripada di Nihongo Flow, tapi dengan aturan tegas: **fitur inti
harus tetap jalan tanpa AI.**

| Fitur | Peran AI | Ada di Nihongo Flow? |
|---|---|---|
| Talk | Percakapan suara real-time via Gemini Live API | Ya, tapi key bocor ke client |
| Kakou | Multimodal: foto tulisan tangan → transkrip + koreksi terstruktur + skor rubrik | Tidak, dulu copy-paste manual |
| Kanji Tamago | Generate mnemonic dari dekomposisi radikal, di-cache di DB | Tidak, endpoint `/mnemonic` hanya menyimpan teks manual |

**Yang jalan tanpa AI sama sekali:** seluruh review SRS, sesi tulis Kakou (tingkat 2 dan 3,
lihat 7.2.1), library grammar, kuis kanji, animasi stroke order, heatmap, statistik, auth.
Kalau `GEMINI_API_KEY` tidak diset atau kuotanya habis, hanya 3 baris di tabel di atas yang
tidak aktif, dan Kakou tetap berfungsi lewat paste-back atau pengecekan mekanis.

**Bank prompt tidak memakai AI runtime.** Keputusan sadar: seluruh konten grammar disusun
saat pengembangan, masuk git, bisa di-review. Lihat 7.2.2.

**Aturan arsitektur:** semua panggilan AI lewat `app/api/ai/`. Tidak ada satu pun kunci
API yang dikirim ke browser. Untuk Talk itu berarti WebSocket relay di server, yang
sekaligus menjadi tempat rate limiting per user.

---

## 12. Keputusan yang sudah dikonfirmasi

| # | Keputusan |
|---|---|
| 1 | **Nama:** Hibi (日々). Folder `hibi/`, nama package `hibi` |
| 2 | **Database:** tabel prefix `hibi_*` berdampingan di database PostgreSQL yang sama. Nihongo Flow tidak disentuh |
| 3 | **Avatar Talk:** VRM 3D **dipertahankan**, dioptimalkan lewat kompresi mesh + progress bar + cache header. Bukan diganti 2D |
| 4 | **Nihongo Flow lama:** tetap dibiarkan jalan sebagai fallback selama Hibi dibangun |
| 5 | **Bahasa UI:** antarmuka Inggris, arti konten Jepang dalam bahasa Indonesia. Sama seperti Nihongo Flow |

### Tindakan di luar coding

`GEMINI_API_KEY` yang sekarang pernah terkirim ke browser lewat
`app/api/live/session/route.ts:17`. Kalau key itu masih aktif, **rotate di Google AI
Studio**. Hibi akan memakai key baru dan tidak pernah mengirimkannya ke client.
