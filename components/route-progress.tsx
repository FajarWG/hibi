"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Bar progres tipis di paling atas layar. Muncul begitu sebuah navigasi
 * internal dimulai (klik <Link>/<a> atau event global "hibi:navigation-start")
 * lalu selesai saat pathname berubah. Tujuannya menghilangkan kesan "halaman
 * membeku": render server + query DB bisa memakan waktu, jadi kita beri umpan
 * balik langsung tanpa menunggu segmen berikutnya selesai.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    function clearTimers() {
      if (trickleRef.current) clearInterval(trickleRef.current);
      if (hideRef.current) clearTimeout(hideRef.current);
      trickleRef.current = null;
      hideRef.current = null;
    }

    function start() {
      if (activeRef.current) return;
      activeRef.current = true;
      clearTimers();
      setVisible(true);
      setWidth(8);
      // Merangkak naik menuju ~90% dengan langkah mengecil (easing) supaya
      // terasa hidup tapi tidak pernah "selesai" sebelum halaman siap.
      trickleRef.current = setInterval(() => {
        setWidth((w) => (w >= 90 ? w : w + Math.max(0.4, (90 - w) * 0.06)));
      }, 180);
    }

    function done() {
      if (!activeRef.current) return;
      activeRef.current = false;
      clearTimers();
      setWidth(100);
      hideRef.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 220);
    }

    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      // Hanya navigasi internal same-origin dan ke path yang berbeda.
      let dest: URL;
      try {
        dest = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (dest.origin !== window.location.origin) return;
      if (dest.pathname === window.location.pathname && dest.search === window.location.search) {
        return;
      }
      start();
    }

    function onManualStart() {
      start();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("hibi:navigation-start", onManualStart);

    // Setiap kali pathname sudah berpindah, navigasi dianggap selesai.
    done();

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hibi:navigation-start", onManualStart);
      clearTimers();
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_var(--color-primary,theme(colors.primary.DEFAULT))] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
