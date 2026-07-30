# Hibi — Handoff / Setup di Laptop Lain

Panduan menjalankan project **Hibi** di mesin baru. Ditulis setelah migrasi
Phase 1 (Anki → skema `hibi_`) selesai dan terverifikasi.

> ⚠️ **JANGAN pernah commit `.env`, folder `backups/`, atau `reports/`.**
> Ketiganya berisi kredensial DB dan/atau data asli. Semuanya sudah masuk
> `.gitignore`, tapi selalu cek `git status` sebelum `git add`.

---

## 1. Prasyarat

| Kebutuhan | Versi yang dipakai saat ini |
|---|---|
| [Bun](https://bun.sh) | `1.3.13` (runtime + package manager) |
| Akses PostgreSQL | DB shared di VPS (sama dengan Nihongo Flow) |
| Git | terbaru |

Tidak perlu Node.js terpisah — semua skrip jalan via Bun.

---

## 2. Ambil kode

```bash
git clone <URL-REPO-HIBI> hibi
cd hibi
```

### Di mana meletakkan folder hasil clone?

- **Untuk menjalankan app (DB shared yang sama):** clone **di mana saja**, berdiri
  sendiri. TIDAK perlu di dalam folder `read-japan`. App tidak membaca apa pun
  dari folder induk, dan media sudah ikut di repo ini.
- **Hanya untuk menjalankan ulang ETL Phase 1 ke DB baru/kosong (Skenario B):**
  folder `hibi/` HARUS berada di dalam project legacy `read-japan/`, karena skrip
  `phase1:*` membaca sumber dari `../src/helper/DekiruNihongoGroup.js` dan
  `../public/anki-media`.

Atau salin folder `hibi/` langsung. **Yang tidak ikut lewat git** (harus disiapkan manual):

- `.env` — kredensial (lihat langkah 3)
- `node_modules/` — hasil `bun install`
- `lib/generated/prisma/` — hasil `prisma generate`
- `.next/` — hasil build/dev
- `reports/`, `backups/` — artefak lokal, tidak perlu dibawa

`public/anki-media/` (± 104 MB, 4353 file) **ikut** di git, jadi media langsung
tersedia. (Kalau mau repo lebih ringan, pindahkan media ke object storage dan
tambahkan `public/anki-media/` ke `.gitignore` — opsional, bukan keharusan.)

---

## 3. Siapkan `.env`

`.env` **tidak** ada di git. Transfer isinya secara aman (password manager,
USB, chat terenkripsi) — **bukan** lewat GitHub/commit.

Salin template lalu isi:

```bash
cp .env.example .env
```

Variabel yang wajib diisi:

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string Postgres. **Encode karakter spesial di password** (mis. `@` → `%40`, `$` → `%24`, `"` → `%22`). Jangan bungkus nilai dengan tanda kutip tunggal di dalam tanda kutip ganda. |
| `JWT_SECRET` | String acak ≥ 32 karakter. Bangkitkan: `bun -e "console.log(crypto.randomBytes(48).toString('base64'))"`. **Pakai secret yang sama** dengan mesin lain agar sesi login tetap valid. |
| `GEMINI_API_KEY` | Opsional. Kosongkan kalau tidak pakai fitur AI. |

> Catatan bug yang pernah terjadi: nilai `DATABASE_URL="'postgres://...'"`
> (ada kutip tunggal literal) membuat host terbaca salah → `P1001 Can't reach
> database server`. Nilai yang benar: `DATABASE_URL="postgresql://user:pass@host:5432/db"`.

---

## 4. Install & generate

```bash
bun install
bun run db:generate     # prisma generate -> lib/generated/prisma
```

`db:generate` wajib dijalankan karena `lib/generated/prisma/` di-gitignore.

---

## 5. Database

### Skenario A — pakai DB shared yang sama (paling umum)

Migrasi & data **sudah selesai** di DB ini. Runner migrasi bersifat idempotent:

```bash
bun run db:migrate      # akan "skip" 0001 & 0002 karena sudah applied
bun run db:smoke        # cek koneksi + constraint; harus "ok"
```

Tidak perlu menjalankan ETL Phase 1 lagi. Akun & kartu sudah ada.

### Skenario B — DB baru / kosong

Perlu menjalankan seluruh pipeline. **Butuh project legacy Nihongo Flow ada di
folder induk** (`../src/helper/DekiruNihongoGroup.js` dan `../public/anki-media`),
karena skrip ETL membaca dari sana.

```bash
bun run db:migrate          # buat semua tabel hibi_
bun run phase1:audit        # (opsional) audit sumber -> reports/phase1/source-audit.json
bun run phase1:dry-run      # review reports/phase1/anki-etl-dry-run.json
bun run phase1:apply        # salin user + kartu + progress
bun run phase1:media:apply  # salin file media ke public/anki-media
bun run phase1:verify       # bukti semua row & due date terjaga -> "phase 1 verification passed"
```

Syarat aman `apply`: report menunjukkan `duplicateKeys=0`, `unmatched=0`,
`userCollisions=0`.

---

## 6. Jalankan app

```bash
bun dev
```

Buka http://localhost:3000

### Akun yang tersedia (hasil migrasi ke DB shared)

| Username | Role | Password |
|---|---|---|
| `FajarWG` | ADMIN | password lama Nihongo Flow |
| `test` | USER | password lama Nihongo Flow |

Login lewat form (Server Action `features/auth/actions.ts`), bukan endpoint
`/api/auth/...`. Kalau ada request klien ke `/api/auth/sign-in/email` yang 404,
itu sisa pemanggilan yang tak terpakai dan bisa diabaikan.

---

## 7. Perintah berguna

| Perintah | Fungsi |
|---|---|
| `bun dev` | dev server |
| `bun run build` | `prisma generate && next build` |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | unit test (termasuk `scripts/phase1/*.test.ts`) |
| `bun run db:migrate` | apply migrasi SQL di `db/migrations/` |
| `bun run db:smoke` | cek koneksi & constraint DB |
| `bun run phase1:verify` | verifikasi hasil migrasi Phase 1 |

---

## 8. Checklist keamanan sebelum push pertama

```bash
git status                                   # pastikan .env / reports / backups TIDAK muncul
git check-ignore -v .env reports backups     # ketiganya harus "ignored"
git ls-files | Select-String "\.env|reports/|backups/|\.dump"   # harus kosong
```

Jangan pernah `git add .` sebelum memastikan hal di atas. Dump DB penuh ada di
`backups/phase1/*.dump` — file ini **tidak boleh** naik ke GitHub.
