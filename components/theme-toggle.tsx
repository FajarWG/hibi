"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // `resolvedTheme` undefined di server dan render client pertama, sehingga
  // keduanya sama-sama merender ikon Moon. next-themes memicu render baru
  // setelah tema sistem diketahui; mounted state tambahan tidak dibutuhkan.
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun weight="duotone" aria-hidden />
      ) : (
        <Moon weight="duotone" aria-hidden />
      )}
    </Button>
  );
}
