/**
 * Fallback Suspense untuk seluruh rute di grup (app). Muncul seketika saat
 * navigasi sementara komponen server (yang membaca DB) masih dirender, jadi
 * pengguna melihat kerangka halaman alih-alih layar kosong yang terasa macet.
 */
export default function AppLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Memuat">
      <div className="space-y-3">
        <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full max-w-[52ch] animate-pulse rounded bg-muted/70" />
        <div className="h-4 w-2/3 max-w-[40ch] animate-pulse rounded bg-muted/70" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}
