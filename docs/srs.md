# Hibi SRS

Satu engine penjadwalan untuk seluruh app. Anki (vocab), Kanji Tamago, dan pola
grammar Kakou dijadwalkan lewat jalur yang sama: model `ReviewState` +
`features/srs/scheduler.ts`.

Nihongo Flow lama punya tiga implementasi SM-2 terpisah (`AnkiProgress`,
`KanjiTamagoProgress`, `KatsuyouReviewCard`) yang tidak saling tahu. Hibi
menggantinya dengan satu antrean "review hari ini".

## Kenapa FSRS, bukan SM-2

FSRS memodelkan memori dengan dua besaran per kartu — **stability** (berapa lama
ingatan bertahan) dan **difficulty** (1..10) — lalu menjadwalkan agar
probabilitas mengingat (`retrievability`) turun ke target retensi (default 0.9)
tepat saat kartu jatuh tempo. Ini lebih akurat daripada faktor ease SM-2 dan
sudah menjadi algoritma bawaan Anki upstream. Implementasi: paket `ts-fsrs`
(pinned `5.4.1`).

## Bentuk engine

`features/srs/scheduler.ts` **sengaja murni**: tidak meng-import Prisma atau
`server-only`, jadi bisa di-unit-test tanpa database dan dipakai baik di server
(menyimpan hasil review) maupun di client (preview interval pada grading bar).

API utama:

| Fungsi | Guna |
|---|---|
| `newState(now)` | State untuk item yang belum pernah dilihat |
| `schedule(state, grade, now)` | Jadwalkan maju satu review → `{ state, log }` |
| `previewGrades(state, now)` | 4 pilihan grade + label interval, tanpa menyimpan |
| `retrievability(state, now)` | Probabilitas ingat saat ini (0..1) |
| `isDue(state, now)` | Apakah item jatuh tempo |

`grade` adalah `"AGAIN" | "HARD" | "GOOD" | "EASY"`, dipetakan 1:1 ke Rating
ts-fsrs 1..4. `now` selalu di-inject supaya deterministik dan bisa di-test.

`schedule` mengembalikan `log` berisi snapshot **sebelum** transisi (rating,
state, stability, difficulty, interval, due). Nilai ini masuk ke `ReviewLog`,
riwayat review yang tidak pernah disimpan Nihongo Flow — tanpanya, melatih ulang
parameter FSRS atau menganalisis kartu yang paling sering gagal mustahil.

## Konversi SM-2 → FSRS (data warisan)

Dilakukan **sekali saat ETL** Phase 1, bukan di jalur runtime. Kode dan test
kanonis ada di `scripts/phase1/transform.ts`. Pendekatannya konservatif; tujuan
utamanya **tidak ada kartu yang reset ke nol dan tidak ada yang tiba-tiba
menumpuk jadi due**:

| Field FSRS | Diturunkan dari | Aturan |
|---|---|---|
| `stability` | `interval` | `interval > 0 ? max(0.1, interval) : 0` (interval hari sebagai proxy stabilitas) |
| `difficulty` | `ease` | Linear: `clamp(5 + (2.5 - ease) · (5/1.2), 1, 10)`. Jadi ease 2.5 → 5.0, ease minimum 1.3 → 10.0 |
| `state` | `repetitions` | `repetitions > 0 ? Review(2) : Relearning(3)` |
| `reps` | `repetitions` | `max(1, repetitions)` |
| `lapses` | `repetitions` | `repetitions > 0 ? 0 : 1` |
| `scheduledDays` | `interval` | `max(0, interval)` |
| `dueAt` | `dueDate` | **apa adanya**, tidak dihitung ulang |

Kolom `legacyInterval`, `legacyEase`, `legacyRepetitions`, `legacyCardKey`, dan
`legacyProgressId` disimpan verbatim di `ReviewState` supaya konversi selalu bisa
diaudit atau dihitung ulang. FSRS mengambil alih penjadwalan pada review
berikutnya; karena `dueAt` dibawa apa adanya, tidak ada lompatan jadwal saat
peralihan.

> Catatan: `PLAN.md` §6 menuliskan `state ← Learning` untuk `repetitions === 0`.
> Implementasi ETL final memakai `Relearning(3)` (kartu yang belum pernah lulus
> dianggap perlu dipelajari ulang). Yang berlaku di database adalah implementasi.

## Batasan yang diketahui

**`learning_steps` tidak disimpan.** ts-fsrs v5 menambah field `learning_steps`
untuk melacak langkah belajar jangka pendek; skema `ReviewState` tidak punya
kolom ini, jadi engine men-default-kannya ke `0` saat memuat (`toCard`).
Konsekuensi: kartu yang sedang di tengah langkah belajar memulai ulang langkahnya
setelah proses restart. Dapat diterima untuk app personal yang datanya mayoritas
state Review.

Jalur upgrade bila fidelitas langkah belajar diperlukan: tambah kolom
`learningSteps Int @default(0)` ke `ReviewState` lewat migrasi additive baru,
lalu petakan di `toCard`/`fromCard`. Tidak ada perubahan lain yang diperlukan.

## Arah (direction)

`ReviewState` unik pada `(userId, itemId, direction)`. `RECOGNIZE` (baca) dan
`RECALL` (tulis kanji) adalah dua jadwal terpisah untuk item yang sama —
perbaikan langsung atas Nihongo Flow yang mencampur keduanya.
