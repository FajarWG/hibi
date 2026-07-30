import type { Metadata } from "next";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { AuthForm } from "@/features/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/today" } = await searchParams;

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/" className="font-heading font-semibold tracking-tight">
          Hibi
        </Link>
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-5xl items-center gap-12 py-12 md:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden space-y-5 md:block">
          <p lang="ja" className="font-jp text-5xl font-medium tracking-tight text-primary">
            日々
          </p>
          <h1 className="max-w-lg font-heading text-4xl font-semibold tracking-tight">
            Study a little. Return tomorrow.
          </h1>
          <p className="max-w-[48ch] text-muted-foreground">
            One daily practice space for vocabulary, writing, kanji, and conversation.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-7 space-y-1.5">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to continue your daily practice.
            </p>
          </div>
          <AuthForm mode="login" nextPath={next} />
        </section>
      </div>
    </main>
  );
}
