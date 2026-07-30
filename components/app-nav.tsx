"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/anki", label: "Cards" },
  { href: "/kakou", label: "Writing" },
  { href: "/kanji", label: "Kanji" },
  { href: "/talk", label: "Talk" },
] as const;

export function AppNav({ username }: { username: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b-2 border-foreground bg-background">
      {/* Tinggi ditahan di bawah 80px dan isinya satu baris di desktop. */}
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/today" className="font-heading text-base font-semibold tracking-tight">
          Hibi
        </Link>

        <nav aria-label="Main navigation" className="flex-1 overflow-x-auto">
          <ul className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 items-center px-3 font-heading text-xs font-bold tracking-wide whitespace-nowrap transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {username}
          </span>
          <ThemeToggle />
          <form action={logout}>
            <Button
              type="submit"
              size="icon-sm"
              variant="ghost"
              aria-label="Sign out"
            >
              <SignOut weight="duotone" aria-hidden />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
