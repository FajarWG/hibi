"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

/**
 * Dual-mode sejak awal, mengikuti preferensi sistem, dengan toggle manual.
 * `disableTransitionOnChange` mencegah seluruh halaman ikut beranimasi
 * saat tema berganti; yang berubah hanya warna, bukan tata letak.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}
